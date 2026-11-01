"""База данных AI-Biostat (SQLite). Один файл data/ai_biostat.db — его достаточно копировать для резервной копии."""
import sqlite3, os, json, time

DB_PATH = os.environ.get("AIB_DB", os.path.join(os.path.dirname(__file__), "..", "data", "ai_biostat.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS participants(
  code TEXT PRIMARY KEY, pwd_hash TEXT NOT NULL, salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student','specialist','teacher')),
  grp TEXT, lang TEXT DEFAULT 'kk', active INTEGER DEFAULT 1, created_at REAL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, code TEXT NOT NULL, created_at REAL);
CREATE TABLE IF NOT EXISTS state(code TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at REAL);
CREATE TABLE IF NOT EXISTS attempts(
  code TEXT, case_id TEXT, step INTEGER, max_step INTEGER, score INTEGER, grade TEXT,
  status TEXT, answers TEXT, started_at REAL, updated_at REAL, completed_at REAL,
  PRIMARY KEY(code, case_id));
CREATE TABLE IF NOT EXISTS events(
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, case_id TEXT, step INTEGER, type TEXT, payload TEXT, ts REAL);
CREATE TABLE IF NOT EXISTS diagnostics(
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, variant TEXT, answers TEXT, pct TEXT, ts REAL);
CREATE TABLE IF NOT EXISTS disputes(
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, case_id TEXT, step TEXT, text TEXT, ai_score INTEGER,
  status TEXT DEFAULT 'open', decision TEXT, new_score INTEGER, reason TEXT, resolved_by TEXT,
  created_at REAL, resolved_at REAL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT, action TEXT, detail TEXT, ts REAL);
"""


def connect():
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    return con


def init():
    with connect() as con:
        con.executescript(SCHEMA)
        cols = {r["name"] for r in con.execute("PRAGMA table_info(participants)")}
        for col in ("first_name", "last_name"):          # профиль (добавлено позже — миграция)
            if col not in cols:
                con.execute(f"ALTER TABLE participants ADD COLUMN {col} TEXT")


def audit(con, actor, action, detail=""):
    """Журнал действий: вход, выгрузки, решения по оспариваниям."""
    con.execute("INSERT INTO audit(actor,action,detail,ts) VALUES(?,?,?,?)",
                (actor, action, json.dumps(detail, ensure_ascii=False), time.time()))
