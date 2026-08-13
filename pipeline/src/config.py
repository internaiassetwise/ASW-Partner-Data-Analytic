from pathlib import Path
import os
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CLEAN_DIR = DATA_DIR / "clean"
ENRICHED_DIR = DATA_DIR / "enriched"
CACHE_DIR = DATA_DIR / "cache"
LOGS_DIR = ROOT / "logs"
REPORTS_DIR = ROOT / "reports"
MANUAL_REVIEW_DIR = ROOT / "manual_review"

SOURCE_DIR = DATA_DIR / "source"

B2B_FILE = SOURCE_DIR / "ฐานข้อมูลรายชื่อ B2B.xlsx"
PROJECTS_FILE = SOURCE_DIR / "ที่ตั้ง 36 โครงการของ AssetWise.xlsx"

for d in [CLEAN_DIR, ENRICHED_DIR, CACHE_DIR, LOGS_DIR, REPORTS_DIR, MANUAL_REVIEW_DIR]:
    d.mkdir(parents=True, exist_ok=True)

load_dotenv(ROOT / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "")
OSM_USER_AGENT = os.getenv("OSM_USER_AGENT", "asw-partner-pipeline/1.0")
