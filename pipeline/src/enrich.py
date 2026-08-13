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

BKK_DISTRICTS = {
    "พระนคร", "ดุสิต", "หนองจอก", "บางรัก", "บางเขน", "บางกะปิ",
    "ปทุมวัน", "ป้อมปราบศัตรูพ่าย", "พระโขนง", "มีนบุรี", "ลาดกระบัง",
    "ยานนาวา", "สัมพันธวงศ์", "พญาไท", "ธนบุรี", "บางกอกใหญ่",
    "ห้วยขวาง", "คลองสาน", "ตลิ่งชัน", "บางกอกน้อย", "บางขุนเทียน",
    "ภาษีเจริญ", "หนองแขม", "ราษฎร์บูรณะ", "บางพลัด", "ดินแดง",
    "บึงกุ่ม", "สาทร", "บางซื่อ", "จตุจักร", "บางคอแหลม", "ประเวศ",
    "คลองเตย", "สวนหลวง", "จอมทอง", "ดอนเมือง", "ราชเทวี", "ลาดพร้าว",
    "วัฒนา", "บางแค", "หลักสี่", "สายไหม", "คันนายาว", "สะพานสูง",
    "วังทองหลาง", "คลองสามวา", "บางนา", "ทวีวัฒนา", "ทุ่งครุ", "บางบอน",
}

# Nominatim occasionally returns a municipality or subdistrict in `county`.
# These mappings promote only cases confirmed by the source address.
LOCAL_ADMIN_TO_DISTRICT = {
    "องค์การบริหารส่วนตำบลลาดหลุมแก้ว": "อำเภอลาดหลุมแก้ว",
    "องค์การบริหารส่วนตำบลบ้านคลองสวน": "อำเภอพระสมุทรเจดีย์",
    "องค์การบริหารส่วนตำบลบางพลีใหญ่": "อำเภอบางพลี",
    "องค์การบริหารส่วนตำบลบางปลา": "อำเภอบางพลี",
    "องค์การบริหารส่วนตำบลคลองหก": "อำเภอคลองหลวง",
}

BKK_SUBZONE_TO_DISTRICT = {
    "แขวงบางแคเหนือ": "เขตบางแค",
    "แขวงบางไผ่": "เขตบางแค",
    "แขวงศาลาธรรมสพน์": "เขตทวีวัฒนา",
    "แขวงทวีวัฒนา": "เขตทวีวัฒนา",
    "แขวงหนองแขม": "เขตหนองแขม",
    "แขวงหนองค้างพลู": "เขตหนองแขม",
}

PROVINCE_BOUNDS = {
    "กรุงเทพมหานคร": (13.35, 14.10, 100.20, 101.00),
    "ปทุมธานี": (13.75, 14.45, 100.10, 101.05),
    "สมุทรปราการ": (13.30, 13.90, 100.30, 101.10),
    "นนทบุรี": (13.65, 14.20, 100.10, 100.80),
    "ชลบุรี": (12.30, 13.75, 100.50, 102.00),
    "ระยอง": (12.20, 13.45, 100.70, 102.10),
    "นครปฐม": (13.40, 14.35, 99.60, 100.70),
    "สมุทรสาคร": (13.25, 13.90, 99.80, 100.70),
    "นครนายก": (13.70, 14.70, 100.60, 101.70),
    "พระนครศรีอยุธยา": (13.60, 14.90, 99.90, 101.20),
    "ฉะเชิงเทรา": (12.90, 14.25, 100.50, 102.00),
    "กาญจนบุรี": (13.20, 16.10, 97.80, 100.50),
}

PROJECT_NAME_OVERRIDES = {
    "เคฟ คาร์นิเวิล รังสิต (KAVE CARNIVAL RANGSIT)": "เคฟ คาร์นิเวิล รังสิต",
}

DUPLICATE_THAI_MARKS = re.compile(r"([\u0E31\u0E34-\u0E3A\u0E47-\u0E4E])\1")
KNOWN_DUPLICATE_GROUPS = [
    ("92d6fdcbda3f6ff6", "8aeb7cd6c41075d3"),
]

ADDRESS_FIELD_OVERRIDES = {
    # Source address omits the administrative words, but the registered
    # address is 289/60 Soi Rom Klao 6/1, Khwaeng/Khét Min Buri.
    "52c31bc04605f34a": ("เขตมีนบุรี", "แขวงมีนบุรี"),
}


def clean_province(s):
    if not s:
        return ""
    return re.sub(r"^จังหวัด\s*", "", s.strip())


def extract_address_province(address):
    address = str(address or "")
    match = re.search(r"จังหวัด\s*([ก-๙]+)", address)
    if not match:
        match = re.search(r"(?:^|\s)จ\.\s*([ก-๙]+)", address)
    if not match:
        return ""
    value = match.group(1).strip()
    return {
        "อยุธยา": "พระนครศรีอยุธยา",
        "กรุงเทพ": "กรุงเทพมหานคร",
    }.get(value, value)


def extract_address_admin_zone(address, province):
    address = str(address or "")
    if province == "กรุงเทพมหานคร":
        candidates = re.findall(r"เขต\s*([ก-๙]+)", address)
        for candidate in candidates:
            for district in sorted(BKK_DISTRICTS, key=len, reverse=True):
                if candidate.startswith(district):
                    return "เขต" + district
        return ""

    match = re.search(r"อำเภอ\s*([ก-๙]+)", address)
    if not match:
        match = re.search(r"(?:^|\s)อ\.\s*([ก-๙]+)", address)
    if not match:
        return ""
    district = match.group(1).strip()
    if district == "เมือง" and province:
        district += province
    return "อำเภอ" + district


def extract_address_subzone(address, province):
    address = str(address or "")
    prefix = "แขวง" if province == "กรุงเทพมหานคร" else "ตำบล"
    match = re.search(prefix + r"\s*([ก-๙]+)", address)
    if not match and prefix == "ตำบล":
        match = re.search(r"(?:^|\s)ต\.\s*([ก-๙]+)", address)
    return prefix + match.group(1).strip() if match else ""


def coordinates_match_province(lat, lng, province):
    bounds = PROVINCE_BOUNDS.get(province)
    if not bounds:
        return True
    try:
        lat_value, lng_value = float(lat), float(lng)
    except (TypeError, ValueError):
        return False
    min_lat, max_lat, min_lng, max_lng = bounds
    return min_lat <= lat_value <= max_lat and min_lng <= lng_value <= max_lng


def merge_values(*values):
    parts = []
    for value in values:
        for part in re.split(r"\s*[;,]\s*", str(value or "")):
            if part and part not in parts:
                parts.append(part)
    return "; ".join(parts)


def merge_known_duplicates(df):
    dropped = []
    for keep_id, drop_id in KNOWN_DUPLICATE_GROUPS:
        keep_rows = df.index[df["external_id"] == keep_id].tolist()
        drop_rows = df.index[df["external_id"] == drop_id].tolist()
        if not keep_rows or not drop_rows:
            continue
        keep_index, drop_index = keep_rows[0], drop_rows[0]
        for field in ("email", "phone", "contact_name", "notes", "remark"):
            df.at[keep_index, field] = merge_values(
                df.at[keep_index, field], df.at[drop_index, field]
            )
        dropped.append(drop_id)
        df = df.drop(index=drop_index)
    return df.reset_index(drop=True), dropped


LOW_LEVEL_ADMIN_PREFIXES = ("หมู่", "หมู่บ้าน", "ตำบล", "แขวง", "ชุมชน")


def select_admin_zone(ad):
    """Select only a district-level value for the เขต/อำเภอ filter."""
    # Outside Bangkok, Nominatim normally stores อำเภอ in `county`; Bangkok
    # commonly stores เขต in `suburb`. Prefer the district-level fields first
    # and never promote a village/tambon/khwaeng value into admin_zone.
    for key in ("county", "district", "suburb"):
        value = str(ad.get(key) or "").strip()
        if value and not value.startswith(LOW_LEVEL_ADMIN_PREFIXES):
            return value
    return ""


def extract_zones(ad):
    """admin_zone (เขต/อำเภอ), subzone (แขวง/ตำบล), province (bare จังหวัด)."""
    admin_zone = select_admin_zone(ad)
    subzone = (
        ad.get("quarter") or ad.get("city_district")
        or ad.get("town") or ad.get("village") or ad.get("neighbourhood") or ""
    )
    province = (
        ad.get("province") or ad.get("state") or ad.get("region") or ad.get("city") or ""
    )
    return admin_zone, subzone.strip(), clean_province(province)


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
    google_applied = google_rejected = 0
    if MYMAPS_FILE.exists():
        mm = json.loads(MYMAPS_FILE.read_text(encoding="utf-8"))
        for pos, row in df.iterrows():
            if row["geo_source"] == "manual":
                continue  # manual always wins
            ov = mm.get(row["external_id"])
            if not ov:
                continue
            expected_province = (
                extract_address_province(row.get("address_full", ""))
                or str(row.get("city", "")).strip()
            )
            if not coordinates_match_province(ov.get("lat"), ov.get("lng"), expected_province):
                google_rejected += 1
                continue
            df.at[pos, "lat"] = str(ov["lat"])
            df.at[pos, "lng"] = str(ov["lng"])
            df.at[pos, "geo_source"] = "google"
            df.at[pos, "geo_precision"] = "precise"
            # keep osm_address so zone extraction uses the OSM-derived เขต
            # (Google coords are in the same เขต for most rows; only the 97
            # city-level rows have empty osm_address and get reverse-geocoded
            # by the fill pass)
            google_applied += 1
        if google_applied:
            print(f"Applied {google_applied} Google geocode overrides")
        if google_rejected:
            print(f"Rejected {google_rejected} Google overrides outside their province")

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

    # ---- fallback: if province still empty but city is set, use city ----
    # (our `city` column already holds canonical province names, so this is
    #  correct for Bangkok city-level rows whose OSM result lacked province).
    def fill_province(row):
        address_province = extract_address_province(row.get("address_full", ""))
        if address_province:
            return address_province
        if row["province"]:
            return row["province"]
        return str(row["city"]).strip()
    df["province"] = df.apply(fill_province, axis=1)

    # ---- source-address normalization ------------------------------------
    # Explicit เขต/อำเภอ/แขวง/ตำบล text in the source is more authoritative
    # than a reverse-geocoder boundary label. It also repairs municipality and
    # village values that otherwise leak into the website filters.
    for pos, row in df.iterrows():
        province_value = str(row["province"]).strip()
        address = row.get("address_full", "")
        address_zone = extract_address_admin_zone(address, province_value)
        address_subzone = extract_address_subzone(address, province_value)
        current_zone = str(row["admin_zone"]).strip()
        current_subzone = str(row["subzone"]).strip()

        if address_zone:
            current_zone = address_zone
        elif current_zone in LOCAL_ADMIN_TO_DISTRICT:
            current_zone = LOCAL_ADMIN_TO_DISTRICT[current_zone]

        if address_subzone:
            current_subzone = address_subzone

        if province_value == "กรุงเทพมหานคร":
            if current_zone and not current_zone.startswith("เขต"):
                current_zone = "เขต" + current_zone
            district_name = current_zone.removeprefix("เขต")
            if district_name not in BKK_DISTRICTS:
                current_zone = BKK_SUBZONE_TO_DISTRICT.get(current_subzone, "")
        elif current_zone and not current_zone.startswith("อำเภอ"):
            current_zone = ""

        # Only expose true แขวง/ตำบล values in the detail panel.
        expected_subzone_prefix = "แขวง" if province_value == "กรุงเทพมหานคร" else "ตำบล"
        if current_subzone and not current_subzone.startswith(expected_subzone_prefix):
            current_subzone = ""

        if row["external_id"] in ADDRESS_FIELD_OVERRIDES:
            current_zone, current_subzone = ADDRESS_FIELD_OVERRIDES[row["external_id"]]

        df.at[pos, "admin_zone"] = current_zone
        df.at[pos, "subzone"] = current_subzone

    # Project labels and zones must stay normalized if the pipeline is rerun.
    project_mask = df["entity_type"] == "project"
    df.loc[project_mask, "name"] = df.loc[project_mask, "name"].replace(PROJECT_NAME_OVERRIDES)
    df.loc[project_mask, "project_zone"] = df.loc[project_mask, "project_zone"].map(
        lambda value: DUPLICATE_THAI_MARKS.sub(r"\1", str(value))
    )

    # Mark fallback/centroid coordinates so distance search can exclude them.
    partner_mask = df["entity_type"] != "project"
    coordinate_counts = (
        df[partner_mask & (df["lat"] != "") & (df["lng"] != "")]
        .groupby(["lat", "lng"])["external_id"].transform("count")
    )
    df.loc[coordinate_counts.index[coordinate_counts >= 5], "geo_precision"] = "approximate"
    for pos, row in df[partner_mask].iterrows():
        if row["geo_source"] in {"manual", "google"}:
            df.at[pos, "geo_precision"] = "precise"
            continue
        query = str(row.get("osm_query_used", "")).strip()
        province_value = re.escape(str(row.get("province", "")).strip())
        if province_value and re.fullmatch(province_value + r",\s*ประเทศไทย", query):
            df.at[pos, "geo_precision"] = "city"
        elif re.fullmatch(r"(?:เขต|แขวง|อำเภอ|ตำบล)[^,]+,\s*[^,]+,\s*ประเทศไทย", query):
            df.at[pos, "geo_precision"] = "district"

    df, merged_duplicate_ids = merge_known_duplicates(df)

    df.to_csv(OUTPUT, index=False, encoding="utf-8-sig")

    # ---- Gate 4 summary ----
    lines = ["# Phase 4 — Enrich Summary (Gate 4)\n"]
    lines.append(f"Total rows: {len(df)}")
    lines.append(f"Reverse geocode (projects): {rev_new} new, {rev_cached} cached, {rev_fail} fail")
    lines.append(f"Reverse geocode (fill gaps): {fill_new} new, {fill_cached} cached, {fill_fail} fail\n")
    lines.append(f"Google overrides rejected outside province: {google_rejected}")
    lines.append(f"Known duplicate rows merged: {len(merged_duplicate_ids)}\n")

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

    lines.append("\n## Coordinate precision\n")
    for precision, count in df["geo_precision"].replace("", "none").value_counts().items():
        lines.append(f"- {precision}: {count}")

    REPORT_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"reverse geocode: {rev_new} new, {rev_cached} cached, {rev_fail} fail")
    print(f"admin_zone filled: {(df['admin_zone']!='').sum()}/{len(df)}")
    print(f"province filled:   {(df['province']!='').sum()}/{len(df)}")
    print(f"report -> {REPORT_FILE}")


if __name__ == "__main__":
    main()
