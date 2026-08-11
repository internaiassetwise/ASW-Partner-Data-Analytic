"""
Phase 2 — run the schema migration against Railway Postgres.

Usage:
    python migrate.py --check     # connection test only (no changes)
    python migrate.py             # run schema.sql (idempotent)

Logic:
  - DATABASE_URL comes from .env (never hardcoded).
  - schema.sql uses IF NOT EXISTS everywhere -> safe to re-run.
  - Reports table columns, indexes, and constraints after running.
"""
import sys
from pathlib import Path

import psycopg2

from config import DATABASE_URL, OSM_USER_AGENT  # noqa: F401 (config loads .env)
from config import ROOT

SCHEMA_FILE = ROOT / "src" / "schema.sql"


def die(msg, code=1):
    print("ERROR:", msg)
    sys.exit(code)


def connect():
    if not DATABASE_URL:
        die("DATABASE_URL is not set. Copy .env.example -> .env and fill it in.")
    try:
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=15)
        conn.autocommit = True
        return conn
    except Exception as e:
        die(f"cannot connect to DB: {e}")


def run_schema(conn):
    sql = SCHEMA_FILE.read_text(encoding="utf-8")
    with conn.cursor() as cur:
        cur.execute(sql)
    print(f"Executed {SCHEMA_FILE.name} (idempotent).")


def report(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'partners'
            ORDER BY ordinal_position;
        """)
        cols = cur.fetchall()
        cur.execute("""
            SELECT indexname FROM pg_indexes
            WHERE tablename = 'partners' ORDER BY indexname;
        """)
        idxs = cur.fetchall()
        cur.execute("""
            SELECT conname FROM pg_constraint
            WHERE conrelid = 'partners'::regclass ORDER BY conname;
        """)
        cons = cur.fetchall()
    print(f"\npartners table: {len(cols)} columns")
    for name, dtype in cols:
        print(f"  - {name:18s} {dtype}")
    print(f"\nindexes: {len(idxs)}")
    for (n,) in idxs:
        print(f"  - {n}")
    print(f"\nconstraints: {len(cons)}")
    for (n,) in cons:
        print(f"  - {n}")


def main():
    args = sys.argv[1:]
    check_only = "--check" in args
    print(f"DATABASE_URL: {DATABASE_URL[:40]}{'...' if len(DATABASE_URL)>40 else ''}")
    conn = connect()
    print("connected.")
    if check_only:
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            print("server:", cur.fetchone()[0][:60])
        print("connection OK (no changes made).")
        conn.close()
        return
    run_schema(conn)
    report(conn)
    conn.close()
    print("\nmigration done.")


if __name__ == "__main__":
    main()
