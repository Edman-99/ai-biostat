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

def test_profile_names_visible_to_teacher_not_in_export():
    make("P-9", "student"); make("T-9", "teacher")
    s, t = client("P-9"), client("T-9")
    r = s.put("/api/profile", json={"first_name": "Айгерим", "last_name": "Тестова"})
    assert r.status_code == 200 and r.json()["last_name"] == "Тестова"
    assert s.get("/api/me").json()["first_name"] == "Айгерим"
    row = [p for p in t.get("/api/teacher/overview").json()["people"] if p["code"] == "P-9"][0]
    assert row["last_name"] == "Тестова"
    assert "Тестова" not in t.get("/api/teacher/export/attempts.csv").text

def test_teacher_imports_participants_and_resets_password():
    make("T-5", "teacher"); make("P-5", "student")
    t = client("T-5")
    csv_text = "﻿code;role;group;lang\np-1001;student;KZ-301;kk\nP-1002;specialist;SPEC-1;ru\nP-5;student;G1;kk\nP-1003;admin;G1;kk\n"
    r = t.post("/api/teacher/participants/import", json={"csv": csv_text}).json()
    assert [a["code"] for a in r["added"]] == ["P-1001", "P-1002"]
    assert r["skipped"] == ["P-5"] and len(r["errors"]) == 1
    client("P-1001", r["added"][0]["password"])               # выданный пароль работает
    pwd = t.post("/api/teacher/participants/p-1001/reset").json()["password"]
    client("P-1001", pwd)
    assert t.post("/api/teacher/participants/T-5/reset").status_code == 400
    assert t.post("/api/teacher/participants/NOPE/reset").status_code == 404
    s = client("P-5")
    assert s.post("/api/teacher/participants/import", json={"csv": csv_text}).status_code == 403

def test_change_own_password():
    make("T-7", "teacher")
    t, other = client("T-7"), client("T-7")
    assert t.put("/api/password", json={"old_password": "000000", "new_password": "Biostat2026"}).status_code == 400
    assert t.put("/api/password", json={"old_password": "123456", "new_password": "123"}).status_code == 400
    assert t.put("/api/password", json={"old_password": "123456", "new_password": "Biostat2026"}).status_code == 200
    assert t.get("/api/me").status_code == 200                 # текущая сессия жива
    assert other.get("/api/me").status_code == 401             # другие закрыты
    client("T-7", "Biostat2026")
    assert TestClient(main.app).post("/api/login", json={"code": "T-7", "password": "123456"}).status_code == 401
