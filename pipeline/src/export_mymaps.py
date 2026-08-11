"""
ขั้น 1 (My Maps flow) — export partners that have INACCURATE coordinates so the
user can upload them to https://mymaps.google.com and get Google-quality coords.

Selection: partners (not projects) whose coords are district- or city-centroid
(i.e. NOT building-level, NOT from file, NOT already hand-fixed).
"""
import pandas as pd
from config import ENRICHED_DIR

INPUT = ENRICHED_DIR / "partners_enriched.csv"
OUTPUT = ENRICHED_DIR.parent / "mymaps" / "partners_to_geocode.csv"


def is_inaccurate(row):
    if row["entity_type"] == "project":
        return False
    if row["lat"] == "":
        return False
    if row["geo_source"] in ("file", "manual"):
        return False
    q = row.get("osm_query_used", "")
    if row["geo_precision"] == "city":
        return True
    if any(q.startswith(k) for k in ["เขต", "แขวง", "อำเภอ", "ตำบล"]):
        return True
    return False


def main():
    df = pd.read_csv(INPUT, dtype=str).fillna("")
    df["_off"] = df.apply(is_inaccurate, axis=1)
    off = df[df["_off"]].copy()

    off["geocode_query"] = off.apply(
        lambda r: ", ".join(p for p in [r["name"], r["address_full"]] if p)
        + ", ประเทศไทย",
        axis=1,
    )

    out = off[["external_id", "name", "address_full", "geocode_query"]]
    out.to_csv(OUTPUT, index=False, encoding="utf-8-sig")

    print(f"Exported {len(out)} rows -> {OUTPUT}")
    print("\nBreakdown of what's being sent to Google:")
    from collections import Counter
    for k, v in Counter(off["entity_type"]).most_common():
        print(f"  {v:4d}  {k}")
    print("\nSample rows:")
    for _, r in out.head(3).iterrows():
        print(f"  [{r['external_id']}] {r['name'][:28]}")
        print(f"     query: {r['geocode_query'][:75]}")


if __name__ == "__main__":
    main()
