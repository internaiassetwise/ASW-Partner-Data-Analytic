"""
ขั้น 3 (My Maps flow) — merge Google geocode results into an override file.

Reads the CSV exported from Google Sheets (via Apps Script geocoding),
creates mymaps_geocodes.json keyed by external_id.

Only rows with Status=OK and valid lat/lng are included.
Rows that are NOT_FOUND or whose coords fall clearly outside expected
provinces are flagged in the report but still included (user can remove).
"""
import json
import pandas as pd
from config import MANUAL_REVIEW_DIR, REPORTS_DIR

INPUT = r"D:\ASW_Partner\partner_geocode.csv"
OUTPUT = MANUAL_REVIEW_DIR / "mymaps_geocodes.json"


def main():
    df = pd.read_csv(INPUT, dtype=str).fillna("")
    overrides = {}
    outliers = []
    not_found = []

    for _, row in df.iterrows():
        eid = row["external_id"]
        name = row["name"]
        lat_s, lng_s = row.get("Latitude", ""), row.get("Longitude", "")
        status = row.get("Status", "")

        if status != "OK" or not lat_s or not lng_s:
            not_found.append({"external_id": eid, "name": name, "status": status})
            continue

        lat, lng = float(lat_s), float(lng_s)
        overrides[eid] = {
            "name": name[:50],
            "lat": lat,
            "lng": lng,
            "source": "google",
        }

        # flag outliers (outside greater Bangkok, may be wrong province)
        if lat < 13.0 or lat > 14.5 or lng < 99.8 or lng > 101.5:
            outliers.append({"external_id": eid, "name": name, "lat": lat, "lng": lng})

    OUTPUT.write_text(json.dumps(overrides, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Google OK: {len(overrides)} -> {OUTPUT}")
    print(f"NOT_FOUND: {len(not_found)}")
    print(f"Outlier (อาจผิดจังหวัด): {len(outliers)}")
    if outliers:
        print("  รายการ outlier:")
        for o in outliers:
            print(f"    {o['name'][:35]:35s} lat={o['lat']:.4f} lng={o['lng']:.4f}")


if __name__ == "__main__":
    main()
