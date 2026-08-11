"""
Phase 4 — Enrich: derive admin_zone / subzone / province.

Sources of zone info:
  - rows geocoded via OSM (Phase 3): parse the `osm_address` dict
  - rows with coords from file (projects, 36): reverse geocode their lat/lng
  - rows without coords (5): no zone (kept, filter still works via `city`)

OSM address keys (observed in Thai data):
  Bangkok   -> suburb=เขต, quarter=แขวง, city=กรุงเทพมหานคร
  Province  -> county=อำเภอ, city_district=ตำบล, province=จังหวัด

Outputs:
  - partners_enriched.csv (input to Phase 5 load)
  - enrich_summary.md (Gate 4)
Reuses geocode_cache.json (adds reverse entries under 'rev:lat,lng').
"""
import json
import re
import time
from collections import Counter

import pandas as pd
from geopy.extra.rate_limiter import RateLimiter
from geopy.geocoders import Nominatim

from config import CACHE_DIR, ENRICHED_DIR, MANUAL_REVIEW_DIR, OSM_USER_AGENT, REPORTS_DIR

INPUT = ENRICHED_DIR / "partners_geocoded.csv"
OUTPUT = ENRICHED_DIR / "partners_enriched.csv"
CACHE_FILE = CACHE_DIR / "geocode_cache.json"
OVERRIDES_FILE = MANUAL_REVIEW_DIR / "manual_geocodes.json"
MYMAPS_FILE = MANUAL_REVIEW_DIR / "mymaps_geocodes.json"
REPORT_FILE = REPORTS_DIR / "enrich_summary.md"


def clean_province(s):
    if not s:
        return ""
    return re.sub(r"^จังหวัด\s*", "", s.strip())


def extract_zones(ad):
    """admin_zone (เขต/อำเภอ), subzone (แขวง/ตำบล), province (bare จังหวัด)."""
    admin_zone = ad.get("suburb") or ad.get("county") or ad.get("district") or ""
    subzone = (
        ad.get("quarter") or ad.get("city_district")
        or ad.get("town") or ad.get("village") or ad.get("neighbourhood") or ""
    )
    province = (
        ad.get("province") or ad.get("state") or ad.get("region") or ad.get("city") or ""
    )
    return admin_zone.strip(), subzone.strip(), clean_province(province)


def main():
    df = pd.read_csv(INPUT, dtype=str).fillna("")
    if CACHE_FILE.exists():
        cache = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    else:
        cache = {}

    # ---- apply manual geocode overrides (hand-tuned queries for rows OSM
    # missed). Sets coords + osm_address so normal zone extraction handles them.
    manual_applied = 0
    if OVERRIDES_FILE.exists():
        overrides = json.loads(OVERRIDES_FILE.read_text(encoding="utf-8"))
        for pos, row in df.iterrows():
            ov = overrides.get(row["external_id"])
            if not ov:
                continue
            df.at[pos, "lat"] = str(ov["lat"])
            df.at[pos, "lng"] = str(ov["lng"])
            df.at[pos, "geo_source"] = "manual"
            df.at[pos, "geo_precision"] = "precise"
            df.at[pos, "osm_address"] = json.dumps(ov.get("address", {}), ensure_ascii=False)
            manual_applied += 1
        if manual_applied:
            print(f"Applied {manual_applied} manual geocode overrides")

    # ---- apply Google geocode overrides (from Google Maps via Apps Script).
    # Priority: manual > google > osm.  Only override rows NOT already
    # manually fixed.
    google_applied = 0
    if MYMAPS_FILE.exists():
        mm = json.loads(MYMAPS_FILE.read_text(encoding="utf-8"))
        for pos, row in df.iterrows():
            if row["geo_source"] == "manual":
                continue  # manual always wins
            ov = mm.get(row["external_id"])
            if not ov:
                continue
            df.at[pos, "lat"] = str(ov["lat"])
            df.at[pos, "lng"] = str(ov["lng"])
            df.at[pos, "geo_source"] = "google"
            df.at[pos, "geo_precision"] = "google"
            # keep osm_address so zone extraction uses the OSM-derived เขต
            # (Google coords are in the same เขต for most rows; only the 97
            # city-level rows have empty osm_address and get reverse-geocoded
            # by the fill pass)
            google_applied += 1
        if google_applied:
            print(f"Applied {google_applied} Google geocode overrides")

    geolocator = Nominatim(user_agent=OSM_USER_AGENT)
    reverse = RateLimiter(
        geolocator.reverse, min_delay_seconds=1.0, max_retries=2,
        swallow_exceptions=False,
    )

    admin_zone = [""] * len(df)
    subzone = [""] * len(df)
    province = [""] * len(df)
    rev_new = rev_cached = rev_fail = 0

    for pos, row in df.iterrows():
        osm_ad = str(row.get("osm_address", "")).strip()
        if osm_ad:
            try:
                ad = json.loads(osm_ad)
            except json.JSONDecodeError:
                ad = {}
            az, sz, pv = extract_zones(ad)
            admin_zone[pos], subzone[pos], province[pos] = az, sz, pv
            continue

        # projects: coords from file, no osm_address -> reverse geocode
        if row["geo_source"] == "file" and row["lat"] and row["lng"]:
            key = f"rev:{row['lat']},{row['lng']}"
            if key in cache:
                ad = cache[key].get("address", {})
                rev_cached += 1
            else:
                try:
                    loc = reverse(
                        (row["lat"], row["lng"]),
                        language="th", addressdetails=True, timeout=10,
                    )
                    ad = (loc.raw or {}).get("address", {}) if loc else {}
                    cache[key] = {"status": "ok", "address": ad}
                    rev_new += 1
                except Exception as e:
                    ad = {}
                    cache[key] = {"status": "error", "error": type(e).__name__ + ": " + str(e)}
                    rev_fail += 1
                CACHE_FILE.write_text(
                    json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8"
                )
            az, sz, pv = extract_zones(ad)
            admin_zone[pos], subzone[pos], province[pos] = az, sz, pv

    df["admin_zone"] = admin_zone
    df["subzone"] = subzone
    df["province"] = province

    # ---- pass 2: fill admin_zone gaps by reverse geocoding the lat/lng ----
    # Only for PRECISE rows (sub-city detail was found). City-centroid rows
    # (geo_precision=='city') are skipped — reverse-geocoding their center
    # point would falsely tag them with the city-center เขต.
    fill_new = fill_cached = fill_fail = 0
    for pos, row in df.iterrows():
        if row["admin_zone"] or not row["lat"] or not row["lng"]:
            continue
        if row.get("geo_precision") == "city":
            continue
        key = f"rev:{row['lat']},{row['lng']}"
        if key in cache:
            ad = cache[key].get("address", {})
            fill_cached += 1
        else:
            try:
                loc = reverse(
                    (row["lat"], row["lng"]),
                    language="th", addressdetails=True, timeout=10,
                )
                ad = (loc.raw or {}).get("address", {}) if loc else {}
                cache[key] = {"status": "ok", "address": ad}
                fill_new += 1
            except Exception as e:
                ad = {}
                cache[key] = {"status": "error", "error": type(e).__name__ + ": " + str(e)}
                fill_fail += 1
            CACHE_FILE.write_text(
                json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        az, sz, pv = extract_zones(ad)
        if az:
            df.at[pos, "admin_zone"] = az
        if sz and not df.at[pos, "subzone"]:
            df.at[pos, "subzone"] = sz
        if pv and not df.at[pos, "province"]:
            df.at[pos, "province"] = pv

    # ---- normalize: Bangkok admin_zone must always carry the เขต prefix ----
    def fix_bkk_zone(row):
        az = str(row["admin_zone"]).strip()
        pv = str(row["province"]).strip()
        if pv == "กรุงเทพมหานคร" and az and not az.startswith("เขต"):
            return "เขต" + az
        return az
    df["admin_zone"] = df.apply(fix_bkk_zone, axis=1)

    # ---- fallback: if province still empty but city is set, use city ----
    # (our `city` column already holds canonical province names, so this is
    #  correct for Bangkok city-level rows whose OSM result lacked province).
    def fill_province(row):
        if row["province"]:
            return row["province"]
        return str(row["city"]).strip()
    df["province"] = df.apply(fill_province, axis=1)

    df.to_csv(OUTPUT, index=False, encoding="utf-8-sig")

    # ---- Gate 4 summary ----
    lines = ["# Phase 4 — Enrich Summary (Gate 4)\n"]
    lines.append(f"Total rows: {len(df)}")
    lines.append(f"Reverse geocode (projects): {rev_new} new, {rev_cached} cached, {rev_fail} fail")
    lines.append(f"Reverse geocode (fill gaps): {fill_new} new, {fill_cached} cached, {fill_fail} fail\n")

    lines.append("## Zone coverage per entity_type\n")
    lines.append("| entity_type | rows | admin_zone | province |")
    lines.append("|---|---|---|---|")
    for et, g in df.groupby("entity_type"):
        az = (g["admin_zone"] != "").sum()
        pv = (g["province"] != "").sum()
        lines.append(f"| {et} | {len(g)} | {az} | {pv} |")

    lines.append("\n## Top 15 admin_zone (เขต/อำเภอ)\n")
    for k, v in Counter(df[df["admin_zone"] != ""]["admin_zone"]).most_common(15):
        lines.append(f"- {v}: {k}")

    lines.append("\n## Top province distribution\n")
    for k, v in Counter(df[df["province"] != ""]["province"]).most_common():
        lines.append(f"- {v}: {k}")

    no_zone = df[(df["admin_zone"] == "") & (df["geo_source"] != "")]
    lines.append(f"\n## Rows with coords but missing admin_zone: {len(no_zone)}")
    if len(no_zone) > 0:
        for et, g in no_zone.groupby("entity_type"):
            lines.append(f"- {et}: {len(g)}")

    REPORT_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"reverse geocode: {rev_new} new, {rev_cached} cached, {rev_fail} fail")
    print(f"admin_zone filled: {(df['admin_zone']!='').sum()}/{len(df)}")
    print(f"province filled:   {(df['province']!='').sum()}/{len(df)}")
    print(f"report -> {REPORT_FILE}")


if __name__ == "__main__":
    main()
