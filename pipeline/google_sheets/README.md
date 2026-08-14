# Google Sheets geocoding workflow

This workflow refreshes only partner coordinates currently classified as
`city`, `district`, or `approximate`.

1. Run `python pipeline/src/export_mymaps.py`.
2. Import `pipeline/data/mymaps/partners_to_geocode.csv` or the prepared XLSX
   workbook into Google Sheets.
3. Open **Extensions > Apps Script**, paste `Geocode.gs`, save, and run
   `geocodePartners`.
4. Download the `GeocodeQueue` sheet as CSV and save it as
   `D:\ASW_Partner\partner_geocode.csv`.
5. Run `python pipeline/src/merge_mymaps.py`.
6. Review `pipeline/manual_review/google_geocode_review.csv`. Only `ROOFTOP`
   and `RANGE_INTERPOLATED` results whose returned province matches the source
   are eligible for automatic use. A partial match is accepted only when its
   returned address also contains the exact source house number.
7. Run `python pipeline/src/enrich.py`, followed by the normal migrate/load
   steps after reviewing the summary.

The Apps Script is resumable and processes at most 20 rows per execution. Rows
with any non-empty `Status` are skipped on later runs, so press Run repeatedly
until the script reports that every row has been processed. This is safe after
an Apps Script time or quota limit.
