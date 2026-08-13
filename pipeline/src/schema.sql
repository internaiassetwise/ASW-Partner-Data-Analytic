-- ============================================================
-- Phase 2 — partners schema (PostgreSQL on Railway)
-- Idempotent: safe to re-run (uses IF NOT EXISTS everywhere).
-- ============================================================

-- ---------- updated_at trigger function (shared) ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ---------- main table ----------
CREATE TABLE IF NOT EXISTS partners (
    id              BIGSERIAL PRIMARY KEY,
    external_id     TEXT    NOT NULL UNIQUE,        -- content hash, upsert key
    entity_type     TEXT    NOT NULL,
    name            TEXT    NOT NULL,
    email           TEXT,
    phone           TEXT,
    contact_name    TEXT,
    street          TEXT,
    city            TEXT,                            -- normalized province name
    address_full    TEXT,                            -- street + city, used for geocoding
    employee_count  INTEGER,
    join_date       DATE,
    project_zone    TEXT,                            -- AssetWise project zone (from source)
    admin_zone      TEXT,                            -- เขต/อำเภอ (derived from geocode, Phase 4)
    subzone         TEXT,                            -- แขวง/ตำบล (derived, Phase 4)
    province        TEXT,                            -- canonical province (derived, Phase 4)
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    geo_source      TEXT,                            -- 'file' | 'osm' | 'manual'
    geo_precision   TEXT,                            -- 'precise' | 'district' | 'city' | 'approximate'
    status          TEXT,                            -- project status: RTM / Pre-sale / ...
    line_id         TEXT,
    follow          TEXT,
    -- marketing flags (clean CSV text -> boolean: non-empty = true)
    m_intranet      BOOLEAN DEFAULT FALSE,
    m_edm           BOOLEAN DEFAULT FALSE,
    m_line          BOOLEAN DEFAULT FALSE,
    m_standee       BOOLEAN DEFAULT FALSE,
    m_poster        BOOLEAN DEFAULT FALSE,
    m_booth         BOOLEAN DEFAULT FALSE,
    m_leaflet       BOOLEAN DEFAULT FALSE,
    remark          TEXT,
    notes           TEXT,
    -- provenance
    source_file     TEXT    NOT NULL,
    source_sheet    TEXT    NOT NULL,
    source_row      INTEGER,
    raw_data        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- integrity guards
    CONSTRAINT chk_entity_type CHECK (entity_type IN (
        'partner', 'sponsor', 'bank', 'external_org',
        'partner_2026', 'gov_bkk', 'gov_district', 'project'
    )),
    -- allow 'google' geo_source (Google Maps geocoder via Apps Script)
    CONSTRAINT chk_geo_source CHECK (
        geo_source IS NULL OR geo_source IN ('file', 'osm', 'manual', 'google')
    ),
    -- catch gross geocode mistakes (must land inside Thailand's bounding box)
    CONSTRAINT chk_geo_bounds CHECK (
        (lat IS NULL AND lng IS NULL)
        OR (lat BETWEEN 5.0 AND 21.0 AND lng BETWEEN 97.0 AND 106.0)
    )
);

-- Existing deployments predate geo_precision; keep migrations idempotent.
ALTER TABLE partners ADD COLUMN IF NOT EXISTS geo_precision TEXT;


-- ---------- indexes (filter columns used by the website) ----------
CREATE INDEX IF NOT EXISTS idx_partners_entity_type  ON partners(entity_type);
CREATE INDEX IF NOT EXISTS idx_partners_city         ON partners(city);
CREATE INDEX IF NOT EXISTS idx_partners_province     ON partners(province);
CREATE INDEX IF NOT EXISTS idx_partners_admin_zone   ON partners(admin_zone);
CREATE INDEX IF NOT EXISTS idx_partners_project_zone ON partners(project_zone);
CREATE INDEX IF NOT EXISTS idx_partners_status       ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_geo_precision ON partners(geo_precision);
-- composite: typical list view filter (type + zone)
CREATE INDEX IF NOT EXISTS idx_partners_type_zone    ON partners(entity_type, admin_zone);
-- spatial index for "nearest partner to project" style queries
CREATE INDEX IF NOT EXISTS idx_partners_geo          ON partners USING GIST (point(lng, lat));


-- ---------- auto updated_at ----------
DROP TRIGGER IF EXISTS trg_partners_updated_at ON partners;
CREATE TRIGGER trg_partners_updated_at
    BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- projects table (the 36 AssetWise developments, separate from
-- partners because they are a different entity: an AssetWise
-- location, not a third-party partner)
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
    id              BIGSERIAL PRIMARY KEY,
    external_id     TEXT    NOT NULL UNIQUE,
    name            TEXT    NOT NULL,
    status          TEXT,                            -- RTM / Pre-sale / ...
    bu              TEXT,                            -- business unit
    zone            TEXT,                            -- broad area (รังสิต, EEC, ...)
    address         TEXT,
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    admin_zone      TEXT,                            -- เขต/อำเภอ
    subzone         TEXT,
    province        TEXT,
    google_map_url  TEXT,
    source_file     TEXT    NOT NULL,
    source_sheet    TEXT    NOT NULL,
    source_row      INTEGER,
    raw_data        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_proj_geo CHECK (
        (lat IS NULL AND lng IS NULL)
        OR (lat BETWEEN 5.0 AND 21.0 AND lng BETWEEN 97.0 AND 106.0)
    )
);

CREATE INDEX IF NOT EXISTS idx_projects_zone     ON projects(zone);
CREATE INDEX IF NOT EXISTS idx_projects_status   ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_province ON projects(province);
CREATE INDEX IF NOT EXISTS idx_projects_geo      ON projects USING GIST (point(lng, lat));

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- link partners -> projects (nullable; only the 114
-- partner_2026 rows that explicitly name a project get a value) ----------
ALTER TABLE partners
    ADD COLUMN IF NOT EXISTS project_id BIGINT
    REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_partners_project_id ON partners(project_id);

-- ---------- update geo_source CHECK to allow 'google' ----------
-- (idempotent: drop + recreate)
ALTER TABLE partners DROP CONSTRAINT IF EXISTS chk_geo_source;
ALTER TABLE partners ADD CONSTRAINT chk_geo_source CHECK (
    geo_source IS NULL OR geo_source IN ('file', 'osm', 'manual', 'google')
);
