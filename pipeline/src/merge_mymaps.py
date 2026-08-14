"""Merge Google Sheets / Apps Script geocoding results into overrides.

The result file is merged with the existing override JSON so a targeted rerun
does not discard previously accepted Google coordinates. Only high-confidence
ROOFTOP and RANGE_INTERPOLATED results are eligible for automatic use. Partial
matches additionally require the source province and house number to match the
returned address. Ambiguous results are written to a review CSV instead.
"""
import argparse
import json
import re
from collections import Counter
from pathlib import Path

import pandas as pd

from config import MANUAL_REVIEW_DIR, REPORTS_DIR, ROOT

DEFAULT_INPUT = ROOT.parent / "partner_geocode.csv"
OUTPUT = MANUAL_REVIEW_DIR / "mymaps_geocodes.json"
REVIEW_OUTPUT = MANUAL_REVIEW_DIR / "google_geocode_review.csv"
REPORT_OUTPUT = REPORTS_DIR / "google_geocode_summary.md"
ACCEPTED_LOCATION_TYPES = {
    "ROOFTOP": "precise",
    "RANGE_INTERPOLATED": "interpolated",
}


def as_bool(value):
    return str(value or "").strip().lower() in {"true", "1", "yes", "y"}


def province_matches(expected, formatted_address):
    expected = str(expected or "").replace("จังหวัด", "").strip()
    formatted_address = str(formatted_address or "").strip()
    if not expected:
        return True
    if expected == "กรุงเทพมหานคร":
        return "กรุงเทพ" in formatted_address
    return expected in formatted_address


def first_address_number(value):
    match = re.search(r"(\d+(?:[/\-]\d+)*)", str(value or ""))
    return match.group(1) if match else ""


def house_number_matches(source_address, formatted_address):
    source_number = first_address_number(source_address)
    if not source_number:
        return False
    returned_numbers = re.findall(r"\d+(?:[/\-]\d+)*", str(formatted_address or ""))
    return source_number in returned_numbers


def evaluate_result(row):
    status = str(row.get("Status", "")).strip().upper()
    if status != "OK":
        return False, "", f"status={status or 'EMPTY'}"

    lat_s = str(row.get("Latitude", "")).strip()
    lng_s = str(row.get("Longitude", "")).strip()
    if not lat_s or not lng_s:
        return False, "", "missing coordinates"
    try:
        lat, lng = float(lat_s), float(lng_s)
    except ValueError:
        return False, "", "invalid coordinates"
    if not (5.0 <= lat <= 21.0 and 97.0 <= lng <= 106.0):
        return False, "", "coordinates outside Thailand"

    location_type = str(row.get("LocationType", "")).strip().upper()
    precision = ACCEPTED_LOCATION_TYPES.get(location_type, "")
    if not precision:
        return False, "", f"low confidence location_type={location_type or 'EMPTY'}"

    if not province_matches(row.get("province"), row.get("FormattedAddress")):
        return False, "", "formatted address does not match source province"

    # The Apps Script query may still be marked partial when Google matches the
    # address but ignores extra text. Accept that case only when both the source
    # house number and province are present in Google's formatted address.
    if as_bool(row.get("PartialMatch")):
        if not house_number_matches(
            row.get("address_full"), row.get("FormattedAddress")
        ):
            return False, "", "partial match without matching house number"
        return True, precision, f"accepted {location_type}; partial but address verified"

    return True, precision, f"accepted {location_type}"


def main(input_path=DEFAULT_INPUT):
    input_path = Path(input_path)
    if not input_path.exists():
        raise FileNotFoundError(
            f"Google Sheets result not found: {input_path}. "
            "Download the processed sheet as CSV and save it at this path."
        )

    df = pd.read_csv(input_path, dtype=str).fillna("")
    required = {
        "external_id",
        "name",
        "address_full",
        "province",
        "Latitude",
        "Longitude",
        "Status",
        "FormattedAddress",
        "LocationType",
        "PartialMatch",
        "PlaceId",
        "ResultType",
        "ProcessedAt",
    }
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(f"Missing required Google Sheets columns: {', '.join(missing)}")

    existing = (
        json.loads(OUTPUT.read_text(encoding="utf-8"))
        if OUTPUT.exists()
        else {}
    )
    accepted = {}
    review_rows = []
    reason_counts = Counter()
    location_type_counts = Counter()

    for _, row in df.iterrows():
        external_id = str(row["external_id"]).strip()
        location_type = str(row.get("LocationType", "")).strip().upper() or "EMPTY"
        location_type_counts[location_type] += 1
        is_accepted, precision, reason = evaluate_result(row)
        reason_counts[reason] += 1

        if is_accepted:
            accepted[external_id] = {
                "name": str(row["name"])[:80],
                "lat": float(row["Latitude"]),
                "lng": float(row["Longitude"]),
                "source": "google",
                "geo_precision": precision,
                "formatted_address": str(row.get("FormattedAddress", "")),
                "location_type": location_type,
                "partial_match": as_bool(row.get("PartialMatch")),
                "place_id": str(row.get("PlaceId", "")),
                "result_type": str(row.get("ResultType", "")),
                "processed_at": str(row.get("ProcessedAt", "")),
                "quality_reason": reason,
            }
            continue

        review_rows.append(
            {
                "external_id": external_id,
                "name": row.get("name", ""),
                "province": row.get("province", ""),
                "admin_zone": row.get("admin_zone", ""),
                "current_precision": row.get("CurrentPrecision", ""),
                "current_lat": row.get("CurrentLatitude", ""),
                "current_lng": row.get("CurrentLongitude", ""),
                "google_lat": row.get("Latitude", ""),
                "google_lng": row.get("Longitude", ""),
                "status": row.get("Status", ""),
                "location_type": location_type,
                "partial_match": row.get("PartialMatch", ""),
                "formatted_address": row.get("FormattedAddress", ""),
                "place_id": row.get("PlaceId", ""),
                "quality_reason": reason,
            }
        )

    existing.update(accepted)
    OUTPUT.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    pd.DataFrame(review_rows).to_csv(REVIEW_OUTPUT, index=False, encoding="utf-8-sig")

    lines = [
        "# Google Sheets Geocode Summary\n",
        f"Input rows: {len(df)}",
        f"Accepted automatically: {len(accepted)}",
        f"Needs review / not found: {len(review_rows)}",
        f"Total Google overrides after merge: {len(existing)}\n",
        "## Location types\n",
    ]
    lines.extend(f"- {key}: {value}" for key, value in location_type_counts.most_common())
    lines.append("\n## Decisions\n")
    lines.extend(f"- {key}: {value}" for key, value in reason_counts.most_common())
    REPORT_OUTPUT.write_text("\n".join(lines), encoding="utf-8")

    print(f"Input rows: {len(df)}")
    print(f"Accepted: {len(accepted)} -> {OUTPUT}")
    print(f"Review: {len(review_rows)} -> {REVIEW_OUTPUT}")
    print(f"Report -> {REPORT_OUTPUT}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input", nargs="?", default=str(DEFAULT_INPUT))
    args = parser.parse_args()
    main(args.input)
