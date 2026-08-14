"""Export low-confidence partner coordinates for Google Sheets geocoding.

The output is intentionally limited to partner rows currently classified as
city, district, or approximate.  Blank result columns match the companion
Apps Script in ``pipeline/google_sheets/Geocode.gs`` so the downloaded sheet
can be merged back into the pipeline without reshaping it.
"""
from collections import Counter

import pandas as pd

from config import ENRICHED_DIR

INPUT = ENRICHED_DIR / "partners_enriched.csv"
OUTPUT = ENRICHED_DIR.parent / "mymaps" / "partners_to_geocode.csv"
LOW_CONFIDENCE = {"city", "district", "approximate", "interpolated", "geometric_center"}
RESULT_COLUMNS = [
    "Latitude",
    "Longitude",
    "Status",
    "FormattedAddress",
    "LocationType",
    "PartialMatch",
    "PlaceId",
    "ResultType",
    "ProcessedAt",
]


def is_inaccurate(row):
    return (
        row["entity_type"] != "project"
        and row["geo_source"] not in {"file", "manual"}
        and row["geo_precision"] in LOW_CONFIDENCE
    )


def main():
    df = pd.read_csv(INPUT, dtype=str).fillna("")
    off = df[df.apply(is_inaccurate, axis=1)].copy()

    off["geocode_query"] = off.apply(
        lambda row: ", ".join(
            value
            # Google Geocoder is address-oriented. Including the company name
            # made every result a partial match even when the returned rooftop
            # address itself was correct.
            for value in [row["address_full"] or row["name"], "ประเทศไทย"]
            if value
        ),
        axis=1,
    )
    off = off.rename(
        columns={
            "lat": "CurrentLatitude",
            "lng": "CurrentLongitude",
            "geo_precision": "CurrentPrecision",
        }
    )
    for column in RESULT_COLUMNS:
        off[column] = ""

    output_columns = [
        "external_id",
        "name",
        "address_full",
        "province",
        "admin_zone",
        "subzone",
        "CurrentLatitude",
        "CurrentLongitude",
        "CurrentPrecision",
        "geocode_query",
        *RESULT_COLUMNS,
    ]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    off[output_columns].to_csv(OUTPUT, index=False, encoding="utf-8-sig")

    print(f"Exported {len(off)} low-confidence rows -> {OUTPUT}")
    print("\nPrecision breakdown:")
    for precision, count in Counter(off["CurrentPrecision"]).most_common():
        print(f"  {count:4d}  {precision}")
    print("\nEntity breakdown:")
    for entity_type, count in Counter(off["entity_type"]).most_common():
        print(f"  {count:4d}  {entity_type}")
    print("\nSample queries:")
    for _, row in off.head(3).iterrows():
        print(f"  [{row['external_id']}] {row['name'][:40]}")
        print(f"     {row['geocode_query'][:100]}")


if __name__ == "__main__":
    main()
