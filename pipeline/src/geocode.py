"""
Phase 3 — Geocode addresses via OSM Nominatim.

Strategy (why this order):
  OSM Nominatim is weak on Bangkok soi/house-number addresses but strong on
  district-level (เขต/แขวง/อำเภอ/ตำบล). So we use a 2-step fallback:
    1. Full address query      (best precision when it works, ~minority)
    2. District-level query    (extracted เขต/ตำบล + city, ~high success)
  The marker for fallback rows sits at the district centroid — acceptable for a
  partner map at city zoom. (Building-level precision would need Google API.)

Guarantees:
  - 1 request/sec (Nominatim usage policy) via RateLimiter
  - EVERY request cached in geocode_cache.json (interrupt-safe, rerun resumes)
  - failures -> manual_review.csv (OSM only, no Google fallback)
  - OSM `address` dict kept for zone derivation in Phase 4
"""
import json
import re
import time
from collections import Counter

import pandas as pd
from geopy.exc import GeocoderServiceError, GeocoderTimedOut
from geopy.extra.rate_limiter import RateLimiter
from geopy.geocoders import Nominatim

from config import (
    CACHE_DIR, CLEAN_DIR, ENRICHED_DIR, MANUAL_REVIEW_DIR,
    OSM_USER_AGENT, REPORTS_DIR,
)

INPUT = CLEAN_DIR / "partners_clean.csv"
OUTPUT = ENRICHED_DIR / "partners_geocoded.csv"
CACHE_FILE = CACHE_DIR / "geocode_cache.json"
MANUAL_FILE = MANUAL_REVIEW_DIR / "manual_review.csv"
REPORT_FILE = REPORTS_DIR / "geocode_summary.md"

PROGRESS_EVERY = 20
THAI = "([ก-๛]+)"


def load_cache():
    if CACHE_FILE.exists():
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    return {}


def save_cache(cache):
    CACHE_FILE.write_text(
        json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def make_query(address_full):
    s = re.sub(r"\s+", " ", str(address_full).strip())
    if "ประเทศไทย" not in s and "thailand" not in s.lower():
        s = s + ", ประเทศไทย"
    return s


def district_queries(addr, city):
    """Return ALL district-level candidate queries (one per keyword found),
    so try_chain can fall through เขต -> แขวง -> อำเภอ -> ตำบล. Fixes cases
    where เขต is malformed (e.g. 'เขตกทม.') but แขวง is the real unit."""
    out = []
    for kw in ["เขต", "แขวง", "อำเภอ", "ตำบล"]:
        m = re.search(kw + r"\s*" + THAI, addr)
        if m:
            q = f"{kw}{m.group(1)}, {city}, ประเทศไทย"
            if q not in out:
                out.append(q)
    if not out and city:
        out.append(f"{city}, ประเทศไทย")
    return out


def call_nominatim(geocode, q):
    try:
        loc = geocode(
            q, country_codes="th",
            addressdetails=True, language="th", timeout=10,
        )
        if loc is None:
            return {"status": "not_found", "query": q}
        raw = loc.raw or {}
        address = raw.get("address", {})
        # A result that only carries city/province/country (no suburb/county/
        # road/etc.) is a city-centroid match, NOT the real address. Treating
        # it as success would cluster everything at Bangkok center. Mark it
        # 'low_precision' so the fallback chain continues to the district query.
        sub_city = ["suburb", "county", "district", "road", "quarter",
                    "city_district", "town", "village", "neighbourhood", "hamlet"]
        precise = any(address.get(k) for k in sub_city)
        return {
            "status": "ok" if precise else "low_precision",
            "query": q,
            "lat": loc.latitude,
            "lng": loc.longitude,
            "display_name": raw.get("display_name", ""),
            "address": address,
        }
    except (GeocoderTimedOut, GeocoderServiceError, Exception) as e:
        return {"status": "error", "query": q, "error": type(e).__name__ + ": " + str(e)}


def migrate_cache_precision(cache):
    """Reclassify stale 'ok' entries that are actually city-centroid matches
    so the chain retries with the district fallback. Idempotent."""
    changed = 0
    sub_city = ["suburb", "county", "district", "road", "quarter",
                "city_district", "town", "village", "neighbourhood", "hamlet"]
    for key, entry in cache.items():
        if entry.get("status") == "ok":
            ad = entry.get("address", {})
            if not any(ad.get(k) for k in sub_city):
                entry["status"] = "low_precision"
                changed += 1
    return changed


def try_chain(geocode, cache, queries):
    """Try queries in order. Return (entry, query_used, precision).
    precision: 'precise' (sub-city detail found), 'city' (only city-centroid
    available), 'none' (not found). A 'city' result still gives usable coords
    but MUST NOT be used to infer admin_zone (it'd be the city-center เขต)."""
    best_low, best_low_q = None, None
    last = {"status": "not_found"}
    seen = set()
    for q in queries:
        if not q or q in seen:
            continue
        seen.add(q)
        if q in cache:
            entry = cache[q]
        else:
            entry = call_nominatim(geocode, q)
            cache[q] = entry
            save_cache(cache)
        st = entry.get("status")
        if st == "ok":
            return entry, q, "precise"
        if st == "low_precision" and best_low is None:
            best_low, best_low_q = entry, q
        last = entry
    if best_low:
        return best_low, best_low_q, "city"
    return last, None, "none"


def main():
    df = pd.read_csv(INPUT, dtype=str).fillna("")
    cache = load_cache()
    migrated = migrate_cache_precision(cache)
    if migrated:
        save_cache(cache)
        print(f"Reclassified {migrated} city-centroid cache entries -> low_precision")

    need = df[(df["lat"] == "") | (df["lng"] == "")].copy()
    have = len(df) - len(need)
    print(f"Total rows: {len(df)} | already geo (file): {have} | to geocode: {len(need)}")
    print(f"Cache size: {len(cache)} prior queries")

    geolocator = Nominatim(user_agent=OSM_USER_AGENT)
    geocode = RateLimiter(
        geolocator.geocode, min_delay_seconds=1.0, max_retries=2,
        swallow_exceptions=False,
    )

    osm_address = [""] * len(df)
    osm_query_used = [""] * len(df)
    geo_precision = [""] * len(df)
    manual = []
    ok = failed = no_addr = 0
    net_calls = cache_hits = 0
    started = time.time()

    for i, (pos, row) in enumerate(need.iterrows(), start=1):
        addr = str(row["address_full"]).strip()
        city = row["city"]
        ident = row["external_id"]

        if not addr:
            no_addr += 1
            manual.append({
                "external_id": ident, "name": row["name"], "city": city,
                "address_full": addr, "reason": "no_address", "tried": "",
            })
            continue

        full_q = make_query(addr)
        queries = [full_q] + [q for q in district_queries(addr, city) if q != full_q]

        cache_before = len(cache)
        entry, q_used, precision = try_chain(geocode, cache, queries)
        net_calls += len(cache) - cache_before
        cache_hits += sum(1 for q in queries if q in cache and q != q_used)

        if precision in ("precise", "city"):
            ok += 1
            df.at[pos, "lat"] = str(entry["lat"])
            df.at[pos, "lng"] = str(entry["lng"])
            df.at[pos, "geo_source"] = "osm"
            geo_precision[pos] = precision
            # Only store osm_address when precise — city-level address would
            # yield a false เขต (the city-center district) in Phase 4.
            if precision == "precise":
                osm_address[pos] = json.dumps(entry.get("address", {}), ensure_ascii=False)
            osm_query_used[pos] = q_used or ""
        else:
            failed += 1
            manual.append({
                "external_id": ident, "name": row["name"], "city": city,
                "address_full": addr, "reason": entry.get("status", "unknown"),
                "tried": " | ".join(queries),
            })

        if i % PROGRESS_EVERY == 0 or i == len(need):
            elapsed = time.time() - started
            rate = i / elapsed if elapsed else 0
            eta = (len(need) - i) / rate if rate else 0
            print(
                f"  [{i}/{len(need)}] ok={ok} fail={failed} no_addr={no_addr} "
                f"net={net_calls} cache={cache_hits} | "
                f"{elapsed/60:.1f}m elapsed, ~{eta/60:.1f}m left",
                flush=True,
            )

    # projects came in with geo_source='file' (precise coords from source)
    for pos, row in df.iterrows():
        if row["geo_source"] == "file" and not geo_precision[pos]:
            geo_precision[pos] = "file"

    df["osm_address"] = osm_address
    df["osm_query_used"] = osm_query_used
    df["geo_precision"] = geo_precision
    df.to_csv(OUTPUT, index=False, encoding="utf-8-sig")

    if manual:
        pd.DataFrame(manual).to_csv(MANUAL_FILE, index=False, encoding="utf-8-sig")

    total_geo = ok + failed + no_addr
    lines = ["# Phase 3 — Geocode Summary (Gate 3)\n"]
    lines.append(f"Input rows: {len(df)} (already had coords: {have})")
    lines.append(f"To geocode: {total_geo}")
    lines.append(f"- OK        : {ok}")
    lines.append(f"- Failed    : {failed}")
    lines.append(f"- No address: {no_addr}")
    rate_pct = 100 * ok / total_geo if total_geo else 0
    lines.append(f"\nSuccess rate: {ok}/{total_geo} = {rate_pct:.1f}%")
    lines.append(f"Network calls: {net_calls} | cache hits used: {cache_hits}")
    lines.append(f"\nOutputs:\n- {OUTPUT}\n- {CACHE_FILE}")
    if manual:
        lines.append(f"- {MANUAL_FILE} ({len(manual)} rows)")

    lines.append("\n## Failures by reason\n")
    for k, v in Counter(m["reason"] for m in manual).most_common():
        lines.append(f"- {k}: {v}")
    lines.append("\n## Failures by entity_type\n")
    fail_ids = {m["external_id"] for m in manual}
    et_fail = df[df["external_id"].isin(fail_ids)]["entity_type"]
    for k, v in et_fail.value_counts().items():
        lines.append(f"- {k}: {v}")

    lines.append("\n## Geocode source breakdown\n")
    src = df["geo_source"].replace("", "none").value_counts()
    for k, v in src.items():
        lines.append(f"- {k}: {v}")

    lines.append("\n## Precision breakdown (of rows with coords)\n")
    prec = df[df["geo_precision"] != ""]["geo_precision"].value_counts()
    for k, v in prec.items():
        tag = {"precise": "sub-city detail (trustworthy zone)",
               "city": "city-centroid only (no zone inferred)",
               "file": "from source file (projects)"}.get(k, k)
        lines.append(f"- {k}: {v}  ({tag})")

    REPORT_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nDONE. ok={ok} fail={failed} no_addr={no_addr}")
    print(f"success: {rate_pct:.1f}% | report -> {REPORT_FILE}")


if __name__ == "__main__":
    main()
