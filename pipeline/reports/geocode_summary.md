# Phase 3 — Geocode Summary (Gate 3)

Input rows: 974 (already had coords: 36)
To geocode: 938
- OK        : 933
- Failed    : 3
- No address: 2

Success rate: 933/938 = 99.5%
Network calls: 1 | cache hits used: 976

Outputs:
- D:\ASW_Partner\pipeline\data\enriched\partners_geocoded.csv
- D:\ASW_Partner\pipeline\data\cache\geocode_cache.json
- D:\ASW_Partner\pipeline\manual_review\manual_review.csv (5 rows)

## Failures by reason

- not_found: 3
- no_address: 2

## Failures by entity_type

- partner_2026: 2
- sponsor: 1
- external_org: 1
- gov_bkk: 1

## Geocode source breakdown

- osm: 933
- file: 36
- none: 5

## Precision breakdown (of rows with coords)

- precise: 836  (sub-city detail (trustworthy zone))
- city: 97  (city-centroid only (no zone inferred))
- file: 36  (from source file (projects))