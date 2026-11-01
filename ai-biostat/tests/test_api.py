"""Автотесты: python -m pytest -q"""
import os, tempfile, importlib
os.environ["AIB_DB"] = os.path.join(tempfile.mkdtemp(), "test.db")
from fastapi.testclient import TestClient
from app import db
from app.security import hash_password
from app import main
importlib.reload(main)

def make(code, role, pwd="123456"):
    h, s = hash_password(pwd)
    with db.connect() as con:
        con.execute("INSERT OR REPLACE INTO participants(code,pwd_hash,salt,role,grp,lang) VALUES(?,?,?,?,?,?)", (code, h, s, role, "G1", "ru"))

def client(code, pwd="123456"):
    c = TestClient(main.app)
    assert c.post("/api/login", json={"code": code, "password": pwd}).status_code == 200
    return c

def test_login_and_wrong_password():
    make("P-1", "student")
    c = TestClient(main.app)
    assert c.post("/api/login", json={"code": "P-1", "password": "000000"}).status_code == 401
    assert c.get("/api/me").status_code == 401
    c = client("p-1")                           # регистр кода не важен
    assert c.get("/api/me").json()["role"] == "student"

def test_progress_saved_and_attempt_status():
    make("P-2", "student")
    c = client("P-2")
    st = {"diagDone": True, "cases": {"21": {"step": 10, "maxStep": 10, "score": 88, "grade": "B+"}}}
    assert c.put("/api/state", json={"state": st}).status_code == 200
    assert c.get("/api/state").json()["state"]["cases"]["21"]["score"] == 88
    make("T-1", "teacher")
    t = client("T-1")
    row = [p for p in t.get("/api/teacher/overview").json()["people"] if p["code"] == "P-2"][0]
    assert row["status"] == "completed" and row["score"] == 88

def test_dispute_flow_and_permissions():
    make("P-3", "student"); make("T-2", "teacher")
    s, t = client("P-3"), client("T-2")
    assert s.get("/api/teacher/overview").status_code == 403
    assert s.post("/api/disputes", json={"case_id": "21", "step": "Шаг 7", "text": "прошу пересмотреть", "ai_score": 70}).status_code == 200
    d = [x for x in t.get("/api/teacher/overview").json()["disputes"] if x["code"] == "P-3"][0]
    assert t.post(f"/api/teacher/disputes/{d['id']}", json={"decision": "change", "new_score": 80, "reason": ""}).status_code == 400
    assert t.post(f"/api/teacher/disputes/{d['id']}", json={"decision": "change", "new_score": 80, "reason": "Ограничение указано"}).status_code == 200
    assert s.get("/api/disputes/mine").json()[0]["new_score"] == 80

def test_export_has_codes_only():
    make("T-3", "teacher")
    t = client("T-3")
    r = t.get("/api/teacher/export/attempts.csv")
    assert r.status_code == 200 and "code;case_id" in r.text
