"""
Phase 5 — Load enriched partners into Railway Postgres.

Logic:
  - Read partners_enriched.csv.
  - Validate each row BEFORE insert (geo bounds, entity_type whitelist,
    required fields). Bad rows -> rejected_rows.csv, never sent to DB.
  - UPSERT via external_id (ON CONFLICT DO UPDATE) -> idempotent, re-runnable.
  - Marketing text -> boolean (non-empty = true).
  - Report inserted/updated/rejected counts.

Re-running safely refreshes the whole table contents without duplicates.
"""
import json
from datetime import datetime

import pandas as pd
import psycopg2
import psycopg2.extras

from config import DATABASE_URL, ENRICHED_DIR, MANUAL_REVIEW_DIR, REPORTS_DIR

INPUT = ENRICHED_DIR / "partners_enriched.csv"
REJECTED_FILE = MANUAL_REVIEW_DIR / "rejected_rows.csv"
REPORT_FILE = REPORTS_DIR / "load_summary.md"

ALLOWED_ENTITY_TYPES = {
    "partner", "sponsor", "bank", "external_org",
    "partner_2026", "gov_bkk", "gov_district", "project",
}
ALLOWED_GEO_SOURCE = {"file", "osm", "manual", "google"}
MARKETING_COLS = ["m_intranet", "m_edm", "m_line", "m_standee", "m_poster", "m_booth", "m_leaflet"]

# Maps the "In zone Project" text used by partner_2026 (Latin script) to the
# actual project name as written in the projects file (Thai script). 7 entries,
# all distinct. Used to resolve partners.project_id.
PROJECT_NAME_MAP = {
    "Modiz สุขุมวิท 50":   "โมดิซ สุขุมวิท 50",
    "Atmoz De Sol":        "แอทโมซ เดอโซล-ทิพวัล สเตชั่น",
    "Atmoz ซีรีน ศรีราชา":  "แอทโมซ ซีรีน ศรีราชา",
    "Atmoz คาแนล รังสิต":   "แอทโมซ คาแนล รังสิต",
    "Atmoz แคนวาส ระยอง":   "แอทโมซ แคนวาส ระยอง",
    "Atmoz Flow Minburi":  "แอทโมซ โฟลว์ มีนบุรี",
    "Maroon":              "มารูน รัชดา 32",
}


def to_int(v):
    if v is None or v == "":
        return None
    try:
        return int(float(str(v)))
    except (ValueError, TypeError):
        return None


def to_float(v):
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def validate(row):
    """Return list of error reasons (empty = ok)."""
    errs = []
    if not row["external_id"]:
        errs.append("missing external_id")
    if not row["name"]:
        errs.append("missing name")
    if not row["entity_type"]:
        errs.append("missing entity_type")
    elif row["entity_type"] not in ALLOWED_ENTITY_TYPES:
        errs.append(f"bad entity_type={row['entity_type']}")
    if row["geo_source"] and row["geo_source"] not in ALLOWED_GEO_SOURCE:
        errs.append(f"bad geo_source={row['geo_source']}")
    lat = to_float(row["lat"])
    lng = to_float(row["lng"])
    if (lat is None) != (lng is None):
        errs.append("partial lat/lng")
    if lat is not None and not (5.0 <= lat <= 21.0 and 97.0 <= lng <= 106.0):
        errs.append(f"geo out of Thailand bounds ({lat},{lng})")
    return errs


def build_record(row):
    lat = to_float(row["lat"])
    lng = to_float(row["lng"])
    raw = row.get("raw_data") or "{}"
    try:
        raw_json = json.loads(raw)
    except json.JSONDecodeError:
        raw_json = {"_raw": raw}
    return {
        "external_id": row["external_id"],
        "entity_type": row["entity_type"],
        "name": row["name"],
        "email": row.get("email") or None,
        "phone": row.get("phone") or None,
        "contact_name": row.get("contact_name") or None,
        "street": row.get("street") or None,
        "city": row.get("city") or None,
        "address_full": row.get("address_full") or None,
        "employee_count": to_int(row.get("employee_count")),
        "join_date": row.get("join_date") or None,
        "project_zone": row.get("project_zone") or None,
        "admin_zone": row.get("admin_zone") or None,
        "subzone": row.get("subzone") or None,
        "province": row.get("province") or None,
        "lat": lat,
        "lng": lng,
        "geo_source": row.get("geo_source") or None,
        "status": row.get("status") or None,
        "line_id": row.get("line_id") or None,
        "follow": row.get("follow") or None,
        "m_intranet": bool(row.get("m_intranet", "")),
        "m_edm": bool(row.get("m_edm", "")),
        "m_line": bool(row.get("m_line", "")),
        "m_standee": bool(row.get("m_standee", "")),
        "m_poster": bool(row.get("m_poster", "")),
        "m_booth": bool(row.get("m_booth", "")),
        "m_leaflet": bool(row.get("m_leaflet", "")),
        "remark": row.get("remark") or None,
        "notes": row.get("notes") or None,
        "source_file": row.get("source_file"),
        "source_sheet": row.get("source_sheet"),
        "source_row": to_int(row.get("source_row")),
        "raw_data": Json(raw_json),
    }


from psycopg2.extras import Json  # noqa: E402


def build_project_record(row):
    """Build a record for the projects table from a project entity row."""
    lat = to_float(row["lat"])
    lng = to_float(row["lng"])
    # parse BU from notes ("BU=1")
    bu = None
    notes = row.get("notes") or ""
    if "BU=" in notes:
        bu = notes.split("BU=")[-1].strip().split()[0] or None
    raw = row.get("raw_data") or "{}"
    try:
        raw_json = json.loads(raw)
    except json.JSONDecodeError:
        raw_json = {"_raw": raw}
    return {
        "external_id": row["external_id"],
        "name": row["name"],
        "status": row.get("status") or None,
        "bu": bu,
        "zone": row.get("project_zone") or None,
        "address": row.get("address_full") or None,
        "lat": lat,
        "lng": lng,
        "admin_zone": row.get("admin_zone") or None,
        "subzone": row.get("subzone") or None,
        "province": row.get("province") or None,
        "google_map_url": row.get("remark") or None,
        "source_file": row.get("source_file"),
        "source_sheet": row.get("source_sheet"),
        "source_row": to_int(row.get("source_row")),
        "raw_data": Json(raw_json),
    }


PROJECT_UPSERT_SQL = """
INSERT INTO projects (
    external_id, name, status, bu, zone, address, lat, lng,
    admin_zone, subzone, province, google_map_url,
    source_file, source_sheet, source_row, raw_data
) VALUES (
    %(external_id)s, %(name)s, %(status)s, %(bu)s, %(zone)s, %(address)s,
    %(lat)s, %(lng)s, %(admin_zone)s, %(subzone)s, %(province)s,
    %(google_map_url)s, %(source_file)s, %(source_sheet)s, %(source_row)s,
    %(raw_data)s
)
ON CONFLICT (external_id) DO UPDATE SET
    name=EXCLUDED.name, status=EXCLUDED.status, bu=EXCLUDED.bu, zone=EXCLUDED.zone,
    address=EXCLUDED.address, lat=EXCLUDED.lat, lng=EXCLUDED.lng,
    admin_zone=EXCLUDED.admin_zone, subzone=EXCLUDED.subzone,
    province=EXCLUDED.province, google_map_url=EXCLUDED.google_map_url,
    source_file=EXCLUDED.source_file, source_sheet=EXCLUDED.source_sheet,
    source_row=EXCLUDED.source_row, raw_data=EXCLUDED.raw_data;
"""


UPSERT_SQL = """
INSERT INTO partners (
    external_id, entity_type, name, email, phone, contact_name, street, city,
    address_full, employee_count, join_date, project_zone, project_id,
    admin_zone, subzone, province, lat, lng, geo_source, status, line_id, follow,
    m_intranet, m_edm, m_line, m_standee, m_poster, m_booth, m_leaflet,
    remark, notes, source_file, source_sheet, source_row, raw_data
) VALUES (
    %(external_id)s, %(entity_type)s, %(name)s, %(email)s, %(phone)s,
    %(contact_name)s, %(street)s, %(city)s, %(address_full)s, %(employee_count)s,
    %(join_date)s, %(project_zone)s, %(project_id)s,
    %(admin_zone)s, %(subzone)s, %(province)s,
    %(lat)s, %(lng)s, %(geo_source)s, %(status)s, %(line_id)s, %(follow)s,
    %(m_intranet)s, %(m_edm)s, %(m_line)s, %(m_standee)s, %(m_poster)s,
    %(m_booth)s, %(m_leaflet)s, %(remark)s, %(notes)s, %(source_file)s,
    %(source_sheet)s, %(source_row)s, %(raw_data)s
)
ON CONFLICT (external_id) DO UPDATE SET
    entity_type=EXCLUDED.entity_type, name=EXCLUDED.name, email=EXCLUDED.email,
    phone=EXCLUDED.phone, contact_name=EXCLUDED.contact_name, street=EXCLUDED.street,
    city=EXCLUDED.city, address_full=EXCLUDED.address_full,
    employee_count=EXCLUDED.employee_count, join_date=EXCLUDED.join_date,
    project_zone=EXCLUDED.project_zone, project_id=EXCLUDED.project_id,
    admin_zone=EXCLUDED.admin_zone,
    subzone=EXCLUDED.subzone, province=EXCLUDED.province, lat=EXCLUDED.lat,
    lng=EXCLUDED.lng, geo_source=EXCLUDED.geo_source, status=EXCLUDED.status,
    line_id=EXCLUDED.line_id, follow=EXCLUDED.follow,
    m_intranet=EXCLUDED.m_intranet, m_edm=EXCLUDED.m_edm, m_line=EXCLUDED.m_line,
    m_standee=EXCLUDED.m_standee, m_poster=EXCLUDED.m_poster,
    m_booth=EXCLUDED.m_booth, m_leaflet=EXCLUDED.m_leaflet,
    remark=EXCLUDED.remark, notes=EXCLUDED.notes,
    source_file=EXCLUDED.source_file, source_sheet=EXCLUDED.source_sheet,
    source_row=EXCLUDED.source_row, raw_data=EXCLUDED.raw_data;
"""


def resolve_project_ids(cur):
    """Build {project_zone_text -> projects.id} using PROJECT_NAME_MAP.
    Matches each mapped Thai name to a project (exact, else substring)."""
    cur.execute("SELECT id, name FROM projects;")
    name_to_id = {name: pid for pid, name in cur.fetchall()}
    resolved = {}
    unmatched = []
    for latin, thai in PROJECT_NAME_MAP.items():
        pid = name_to_id.get(thai)
        if pid is None:
            # substring fallback
            for pname, ppid in name_to_id.items():
                if thai in pname or pname in thai:
                    pid = ppid
                    break
        if pid is None:
            unmatched.append((latin, thai))
        else:
            resolved[latin] = pid
    return resolved, unmatched


def main():
    df = pd.read_csv(INPUT, dtype=str).fillna("")
    print(f"Read {len(df)} rows from {INPUT.name}")

    # ---- split: projects vs partners ----
    projects_df = df[df["entity_type"] == "project"]
    partners_df = df[df["entity_type"] != "project"]
    print(f"Split: {len(projects_df)} projects, {len(partners_df)} partners")

    # ---- validate ----
    good_proj, good_part, rejected = [], [], []
    for _, row in projects_df.iterrows():
        errs = validate(row)
        (good_proj if not errs else rejected).append(
            row if not errs else {**row, "_errors": "; ".join(errs)})
    for _, row in partners_df.iterrows():
        errs = validate(row)
        (good_part if not errs else rejected).append(
            row if not errs else {**row, "_errors": "; ".join(errs)})
    if rejected:
        pd.DataFrame(rejected).to_csv(REJECTED_FILE, index=False, encoding="utf-8-sig")
        print(f"REJECTED {len(rejected)} rows -> {REJECTED_FILE}")
        for r in rejected[:10]:
            print(f"  - {r['external_id']} {r['name'][:30]}: {r['_errors']}")
    print(f"Valid: {len(good_proj)} projects, {len(good_part)} partners")

    if not DATABASE_URL:
        print("DATABASE_URL not set; aborting before insert.")
        return

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    proj_ins = proj_upd = part_ins = part_upd = cleanup_del = 0
    unmatched = []
    try:
        with conn.cursor() as cur:
            # 1) upsert projects
            cur.execute("SELECT external_id FROM projects;")
            existing_proj = {r[0] for r in cur.fetchall()}
            for row in good_proj:
                cur.execute(PROJECT_UPSERT_SQL, build_project_record(row))
                if row["external_id"] in existing_proj:
                    proj_upd += 1
                else:
                    proj_ins += 1

            # 2) resolve project_id mapping (after projects are loaded)
            pid_map, unmatched = resolve_project_ids(cur)

            # 3) cleanup: remove old project rows previously loaded into partners
            cur.execute("DELETE FROM partners WHERE entity_type = 'project';")
            cleanup_del = cur.rowcount

            # 4) upsert partners with project_id resolved
            cur.execute("SELECT external_id FROM partners;")
            existing_part = {r[0] for r in cur.fetchall()}
            for row in good_part:
                rec = build_record(row)
                rec["project_id"] = pid_map.get(row.get("project_zone", ""))
                cur.execute(UPSERT_SQL, rec)
                if row["external_id"] in existing_part:
                    part_upd += 1
                else:
                    part_ins += 1
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    if unmatched:
        print(f"WARNING: {len(unmatched)} project_name_map entries unmatched: {unmatched}")

    # ---- verify ----
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM projects;")
        proj_total = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM partners;")
        part_total = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM partners WHERE project_id IS NOT NULL;")
        linked = cur.fetchone()[0]
        cur.execute("""
            SELECT p.zone, count(*) FROM projects p GROUP BY p.zone
            ORDER BY 2 DESC LIMIT 8;
        """)
        proj_by_zone = cur.fetchall()
        cur.execute("""
            SELECT entity_type, count(*) FROM partners
            GROUP BY entity_type ORDER BY count(*) DESC;
        """)
        by_type = cur.fetchall()
    conn.close()

    lines = ["# Phase 5 — Load Summary (Gate 5)\n"]
    lines.append(f"CSV rows: {len(df)} -> projects {len(projects_df)} + partners {len(partners_df)}")
    lines.append(f"Rejected: {len(rejected)}\n")
    lines.append("projects: inserted=%d updated=%d -> DB total %d"
                 % (proj_ins, proj_upd, proj_total))
    lines.append("partners: inserted=%d updated=%d (cleanup deleted %d old project rows) -> DB total %d"
                 % (part_ins, part_upd, cleanup_del, part_total))
    lines.append(f"partners linked to a project (project_id): {linked}\n")
    lines.append("## projects per zone (top)\n")
    for z, c in proj_by_zone:
        lines.append(f"- {z}: {c}")
    lines.append("\n## partners per entity_type\n")
    for et, c in by_type:
        lines.append(f"- {et}: {c}")
    if unmatched:
        lines.append("\n## UNMATCHED project_name_map entries\n")
        for latin, thai in unmatched:
            lines.append(f"- {latin!r} -> {thai!r}")
    REPORT_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nprojects DB={proj_total} | partners DB={part_total} | linked={linked}")
    print(f"report -> {REPORT_FILE}")


if __name__ == "__main__":
    main()
