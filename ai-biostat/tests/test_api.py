"""Автотесты: python -m pytest -q"""
import os, tempfile, importlib
os.environ["AIB_DB"] = os.path.join(tempfile.mkdtemp(), "test.db")
from fastapi.testclient import TestClient
from app import db
from app.security import hash_password
from app import main
importlib.reload(main)

def make(code, role, pwd="123456", grp="G1", groups=("*",)):
    """Преподаватель по умолчанию — главный (видит все группы); groups=… — закреплённые группы."""
    h, s = hash_password(pwd)
    with db.connect() as con:
        con.execute("INSERT OR REPLACE INTO participants(code,pwd_hash,salt,role,grp,lang) VALUES(?,?,?,?,?,?)", (code, h, s, role, grp, "ru"))
        if role == "teacher":
            con.execute("DELETE FROM teacher_groups WHERE teacher=?", (code,))
            con.executemany("INSERT INTO teacher_groups VALUES(?,?)", [(code, g) for g in groups])

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

def test_teacher_creates_group_with_auto_codes():
    make("T-8", "teacher"); make("P-1500", "student")
    t = client("T-8")
    r = t.post("/api/teacher/participants/group", json={"group": "KZ-302", "count": 3, "role": "student", "lang": "kk"}).json()
    codes = [a["code"] for a in r["added"]]
    assert codes == ["P-1501", "P-1502", "P-1503"]               # после самого большого занятого номера
    assert all(a["group"] == "KZ-302" and len(a["password"]) == 6 for a in r["added"])
    client("P-1502", r["added"][1]["password"])
    s = t.post("/api/teacher/participants/group", json={"group": "SPEC-2", "count": 1, "role": "specialist", "lang": "ru"}).json()
    assert s["added"][0]["code"].startswith("S-")
    assert t.post("/api/teacher/participants/group", json={"group": "", "count": 3}).status_code == 400
    assert t.post("/api/teacher/participants/group", json={"group": "X", "count": 500}).status_code == 400
    assert t.post("/api/teacher/participants/group", json={"group": "X", "count": 1, "role": "teacher"}).status_code == 400

def test_teacher_analytics_codes_only_and_trainer():
    make("P-20", "student"); make("T-20", "teacher")
    s, t = client("P-20"), client("T-20")
    assert s.get("/api/teacher/analytics").status_code == 403
    st = {"diagDone": True, "trainer": {"t1": {"verdict": "wrong", "reason": "x", "ok": True, "tries": 1}},
          "cases": {"21": {"step": 10, "maxStep": 10, "score": 70, "flags": [4]}}}
    assert s.put("/api/state", json={"state": st}).status_code == 200
    assert s.post("/api/diagnostic", json={"variant": "A", "answers": [1], "pct": {"Биостатистика": 72}}).status_code == 200
    s.put("/api/profile", json={"first_name": "Айгерим", "last_name": "Тестова"})
    a = t.get("/api/teacher/analytics").json()
    assert "Тестова" not in str(a)
    me = [p for p in a["people"] if p["code"] == "P-20"][0]
    assert me["last_active"] and me["grp"] == "G1"
    att = [x for x in a["attempts"] if x["code"] == "P-20"][0]
    assert att["progress"]["flags"] == [4] and att["score"] == 70
    assert a["diagnostics"]["P-20"]["Биостатистика"] == 72
    assert a["trainer"]["P-20"]["t1"]["ok"] is True


def test_teacher_sees_only_assigned_groups():
    make("P-31", "student", grp="A1"); make("P-32", "student", grp="B1")
    make("T-31", "teacher", groups=("A1",)); make("T-32", "teacher", groups=())
    for code in ("P-31", "P-32"):
        c = client(code)
        c.put("/api/state", json={"state": {"cases": {"21": {"step": 10, "maxStep": 10, "score": 50}}}})
        c.post("/api/disputes", json={"case_id": "21", "step": "Шаг 7", "text": "x", "ai_score": 50})
    t = client("T-31")
    assert t.get("/api/me").json()["scope"] == ["A1"]
    ov = t.get("/api/teacher/overview").json()
    assert {p["code"] for p in ov["people"]} == {"P-31"}
    assert {d["code"] for d in ov["disputes"]} == {"P-31"}
    an = t.get("/api/teacher/analytics").json()
    assert {p["code"] for p in an["people"]} == {"P-31"} and {a["code"] for a in an["attempts"]} == {"P-31"}
    assert "P-32" not in t.get("/api/teacher/export/attempts.csv").text
    assert t.post("/api/teacher/participants/P-32/reset").status_code == 404
    assert t.post("/api/teacher/participants/P-31/reset").status_code == 200
    assert t.post("/api/teacher/confirm/P-32/21").status_code == 404
    other = [d for d in client("T-1").get("/api/teacher/overview").json()["disputes"] if d["code"] == "P-32"][0]
    assert t.post(f"/api/teacher/disputes/{other['id']}", json={"decision": "keep", "reason": "x"}).status_code == 404
    assert t.post("/api/teacher/participants/group", json={"group": "B1", "count": 1}).status_code == 403
    csv_text = "\n".join(["code;role;group;lang", "P-33;student;B1;ru", "T-33;teacher;A1;ru", "P-34;student;A1;ru"])
    r = t.post("/api/teacher/participants/import", json={"csv": csv_text}).json()
    assert [a["code"] for a in r["added"]] == ["P-34"] and len(r["errors"]) == 2
    assert t.get("/api/teacher/teachers").status_code == 403
    assert client("T-32").get("/api/teacher/overview").json()["people"] == []   # без групп — никого
    tl = {x["code"]: x["groups"] for x in client("T-1").get("/api/teacher/teachers").json()}
    assert tl["T-31"] == ["A1"] and tl["T-1"] == ["*"]


def test_existing_teachers_become_admin_on_upgrade():
    with db.connect() as con:
        con.execute("DROP TABLE teacher_groups")
    make("T-40", "student")                       # заглушка, чтобы был кто-то ещё
    with db.connect() as con:
        con.execute("UPDATE participants SET role='teacher' WHERE code='T-40'")
    db.init()
    with db.connect() as con:
        assert con.execute("SELECT grp FROM teacher_groups WHERE teacher='T-40'").fetchone()["grp"] == "*"


def test_exit_diagnostic_opened_per_group():
    make("P-50", "student", grp="E1"); make("P-51", "student", grp="E2")
    make("T-50", "teacher", groups=("E1",)); make("T-51", "teacher")
    s1, s2, t, admin = client("P-50"), client("P-51"), client("T-50"), client("T-51")
    assert s1.get("/api/me").json()["exit_open"] is False
    body = {"variant": "B", "answers": [1], "pct": {"Биостатистика": 80}}
    assert s1.post("/api/diagnostic", json=body).status_code == 403          # ещё закрыта
    assert s1.post("/api/diagnostic", json={"variant": "A", "answers": [0], "pct": {"Биостатистика": 40}}).status_code == 200
    assert t.post("/api/teacher/diagnostics/exit", json={"group": "E2", "open": True}).status_code == 403  # чужая группа
    assert t.post("/api/teacher/diagnostics/exit", json={"group": "E1", "open": True}).status_code == 200
    assert s1.get("/api/me").json()["exit_open"] is True
    assert s2.get("/api/me").json()["exit_open"] is False
    assert s1.post("/api/diagnostic", json=body).status_code == 200
    assert s2.post("/api/diagnostic", json=body).status_code == 403
    st = {r["grp"]: r for r in t.get("/api/teacher/diagnostics").json()}
    assert list(st) == ["E1"] and st["E1"]["entry_done"] == 1 and st["E1"]["exit_done"] == 1 and st["E1"]["exit_open"] is True
    assert "E2" in {r["grp"] for r in admin.get("/api/teacher/diagnostics").json()}
    an = admin.get("/api/teacher/analytics").json()
    assert an["diagnostics"]["P-50"]["Биостатистика"] == 40 and an["exit"]["P-50"]["Биостатистика"] == 80
    assert t.post("/api/teacher/diagnostics/exit", json={"group": "E1", "open": False}).status_code == 200
    assert s1.get("/api/me").json()["exit_open"] is False
    assert admin.get("/api/teacher/export/diagnostics.csv").text.count("P-50") == 2


def test_case_editor_texts_history_and_permissions():
    make("P-60", "student"); make("T-60", "teacher"); make("T-61", "teacher", groups=("G1",))
    s, admin, other = client("P-60"), client("T-60"), client("T-61")
    assert s.get("/api/cases/edits").json() == {}
    body = {"texts": {"situation.paragraphs.0": "Новый текст ситуации", "method.options.2": "χ²-критерий"}}
    assert other.put("/api/teacher/cases/21/kk", json=body).status_code == 403          # не главный
    assert s.put("/api/teacher/cases/21/kk", json=body).status_code == 403              # студент
    assert admin.put("/api/teacher/cases/99/kk", json=body).status_code == 404
    assert admin.put("/api/teacher/cases/21/xx", json=body).status_code == 404
    assert admin.put("/api/teacher/cases/21/kk", json={"texts": {"bad key!": "x"}}).status_code == 400
    assert admin.put("/api/teacher/cases/21/kk", json={"texts": {"a": 5}}).status_code == 400
    assert admin.put("/api/teacher/cases/21/kk", json=body).status_code == 200
    assert s.get("/api/cases/edits").json()["21"]["kk"]["method.options.2"] == "χ²-критерий"
    assert admin.put("/api/teacher/cases/21/kk", json={"texts": {}}).status_code == 200   # вернуть исходное
    assert "21" not in s.get("/api/cases/edits").json()
    hist = admin.get("/api/teacher/cases/21/history").json()
    assert len(hist) == 2 and hist[1]["texts"]["situation.paragraphs.0"] == "Новый текст ситуации"
    assert other.put("/api/teacher/case-status/21", json={"status": "biostat"}).status_code == 403
    assert admin.put("/api/teacher/case-status/21", json={"status": "nope"}).status_code == 400
    assert admin.put("/api/teacher/case-status/21", json={"status": "biostat", "note": "отправлено 18.11"}).status_code == 200
    row = [c for c in other.get("/api/teacher/cases").json() if c["case_id"] == "21"][0]
    assert row["status"] == "biostat" and row["saves"] == 2 and row["note"] == "отправлено 18.11"


def test_tutor_chat_saved_blocked_and_limited(monkeypatch):
    from app import tutor
    make("P-70", "student"); make("T-70", "teacher")
    s, t = client("P-70"), client("T-70")
    body = {"case_id": "21", "step": 5, "lang": "kk", "context": "Кейс 21, қадам 5", "messages": [{"role": "user", "content": "χ² деген не?"}]}
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    assert s.get("/api/tutor/status").json()["enabled"] is False
    assert s.post("/api/tutor", json=body).status_code == 503          # без ключа — выключен
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test")
    seen = {}
    def fake_ask(messages, context):
        seen["messages"], seen["context"] = messages, context
        return {"text": "χ² — жиіліктерді салыстыру критерийі.", "refused": False, "input_tokens": 100, "output_tokens": 20}
    monkeypatch.setattr(tutor, "ask", fake_ask)
    r = s.post("/api/tutor", json=body)
    assert r.status_code == 200 and r.json()["reply"].startswith("χ²")
    assert "қазақ" in seen["context"] and seen["messages"][-1]["content"] == "χ² деген не?"
    assert s.post("/api/tutor", json={**body, "step": 7}).status_code == 403   # закрытый шаг
    assert s.post("/api/tutor", json={**body, "messages": [{"role": "assistant", "content": "x"}]}).status_code == 400
    csv_text = t.get("/api/teacher/export/tutor.csv").text
    assert "χ² деген не?" in csv_text and "P-70" in csv_text and "assistant" in csv_text
    monkeypatch.setattr(tutor, "DAILY_LIMIT", 1)
    assert s.post("/api/tutor", json=body).status_code == 429
    assert s.get("/api/tutor/status").json()["left"] == 0


def test_survey_open_submit_sus_and_export():
    from app.main import sus_score
    best = {f"sus{i}": (5 if i % 2 else 1) for i in range(1, 11)}
    assert sus_score(best) == 100.0 and sus_score({f"sus{i}": 3 for i in range(1, 11)}) == 50.0
    assert sus_score({"sus1": 5}) is None
    make("P-80", "student", grp="S1"); make("P-81", "student", grp="S2")
    make("T-80", "teacher", groups=("S1",)); make("T-81", "teacher")
    s1, s2, t, admin = client("P-80"), client("P-81"), client("T-80"), client("T-81")
    ans = {**best, "part_cases": 5, "part_tutor": 0, "self_method_before": 2, "self_method_now": 4, "open_liked": "Кейсы; удобно"}
    assert s1.get("/api/me").json()["survey_open"] is False
    assert s1.post("/api/survey", json={"answers": ans}).status_code == 403            # ещё закрыт
    assert t.post("/api/teacher/survey/open", json={"group": "S2", "open": True}).status_code == 403
    assert t.post("/api/teacher/survey/open", json={"group": "S1", "open": True}).status_code == 200
    assert s1.get("/api/me").json()["survey_open"] is True
    assert s1.post("/api/survey", json={"answers": {"sus1": 9}}).status_code == 400
    assert s1.post("/api/survey", json={"answers": {"Bad Key": 1}}).status_code == 400
    r = s1.post("/api/survey", json={"answers": ans}); assert r.status_code == 200 and r.json()["sus"] == 100.0
    assert s1.get("/api/survey/mine").json()["done"] is True
    assert s2.post("/api/survey", json={"answers": ans}).status_code == 403
    assert t.post("/api/survey", json={"answers": {**best, "open_liked": "панель"}}).status_code == 200   # преподавателю всегда
    st = t.get("/api/teacher/survey").json()
    assert [g["grp"] for g in st["groups"]] == ["S1"] and st["groups"][0]["done"] == 1 and st["groups"][0]["sus_avg"] == 100.0
    assert st["mine_done"] is True
    csv_t = t.get("/api/teacher/export/survey.csv").text
    assert "P-80" in csv_t and "T-80" not in csv_t and "self_method_now" in csv_t and "Кейсы; удобно" in csv_t
    assert "T-80" in admin.get("/api/teacher/export/survey.csv").text           # ответы преподавателей — главному
