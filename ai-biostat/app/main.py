"""AI-Biostat — сервер пилотной версии.
Запуск:  uvicorn app.main:app --host 0.0.0.0 --port 8000
"""
import csv, io, json, os, time
from fastapi import FastAPI, HTTPException, Request, Response, Depends
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from . import db, participants
from .security import check_password, hash_password, new_token

app = FastAPI(title="AI-Biostat", docs_url=None, redoc_url=None)
STATIC = os.path.join(os.path.dirname(__file__), "..", "static")
COOKIE = "aib_session"
SECURE_COOKIE = os.environ.get("AIB_SECURE_COOKIE", "0") == "1"   # поставить 1, когда сайт работает через HTTPS
db.init()


# ---------- вход ----------
def current(request: Request):
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(401, "Требуется вход")
    with db.connect() as con:
        row = con.execute("SELECT p.* FROM sessions s JOIN participants p ON p.code=s.code "
                          "WHERE s.token=? AND p.active=1", (token,)).fetchone()
    if not row:
        raise HTTPException(401, "Сессия истекла — войдите снова")
    return dict(row)


def teacher(user=Depends(current)):
    if user["role"] != "teacher":
        raise HTTPException(403, "Доступно только преподавателю")
    return user


class Login(BaseModel):
    code: str
    password: str


_fails: dict[str, list[float]] = {}


@app.post("/api/login")
def login(body: Login, response: Response):
    code = body.code.strip().upper()
    recent = [t for t in _fails.get(code, []) if time.time() - t < 600]
    if len(recent) >= 10:
        raise HTTPException(429, "Слишком много попыток. Подождите 10 минут")
    with db.connect() as con:
        p = con.execute("SELECT * FROM participants WHERE code=? AND active=1", (code,)).fetchone()
        if not p or not check_password(body.password.strip(), p["pwd_hash"], p["salt"]):
            _fails[code] = recent + [time.time()]
            raise HTTPException(401, "Неверный код участника или пароль")
        token = new_token()
        con.execute("INSERT INTO sessions VALUES(?,?,?)", (token, code, time.time()))
        db.audit(con, code, "login")
    response.set_cookie(COOKIE, token, httponly=True, samesite="lax", secure=SECURE_COOKIE, max_age=60 * 60 * 24 * 30)
    return _me(dict(p))


@app.post("/api/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get(COOKIE)
    if token:
        with db.connect() as con:
            con.execute("DELETE FROM sessions WHERE token=?", (token,))
    response.delete_cookie(COOKIE)
    return {"ok": True}


def _me(u):
    return {"code": u["code"], "role": u["role"], "group": u["grp"], "lang": u["lang"],
            "first_name": u.get("first_name") or "", "last_name": u.get("last_name") or ""}


@app.get("/api/me")
def me(user=Depends(current)):
    return _me(user)


class Profile(BaseModel):
    first_name: str
    last_name: str


@app.put("/api/profile")
def profile(body: Profile, user=Depends(current)):
    fn, ln = body.first_name.strip()[:60], body.last_name.strip()[:60]
    with db.connect() as con:
        con.execute("UPDATE participants SET first_name=?, last_name=? WHERE code=?", (fn, ln, user["code"]))
        db.audit(con, user["code"], "profile")
    user.update(first_name=fn, last_name=ln)
    return _me(user)


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


@app.put("/api/password")
def change_password(body: PasswordChange, request: Request, user=Depends(current)):
    """Свой пароль вместо выданного. Остальные сессии участника закрываются, текущая остаётся."""
    old, new = body.old_password.strip(), body.new_password.strip()
    if not check_password(old, user["pwd_hash"], user["salt"]):
        raise HTTPException(400, "Текущий пароль неверный")
    if len(new) < 6 or len(new) > 64:
        raise HTTPException(400, "Новый пароль — от 6 до 64 символов")
    h, salt = hash_password(new)
    with db.connect() as con:
        con.execute("UPDATE participants SET pwd_hash=?, salt=? WHERE code=?", (h, salt, user["code"]))
        con.execute("DELETE FROM sessions WHERE code=? AND token!=?", (user["code"], request.cookies.get(COOKIE)))
        db.audit(con, user["code"], "password_change")
    return {"ok": True}


# ---------- сохранение прогресса ----------
class State(BaseModel):
    state: dict


@app.get("/api/state")
def get_state(user=Depends(current)):
    with db.connect() as con:
        row = con.execute("SELECT json FROM state WHERE code=?", (user["code"],)).fetchone()
    return {"state": json.loads(row["json"]) if row else None}


@app.put("/api/state")
def put_state(body: State, user=Depends(current)):
    s, now, code = body.state, time.time(), user["code"]
    with db.connect() as con:
        con.execute("INSERT INTO state VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET json=excluded.json, "
                    "updated_at=excluded.updated_at", (code, json.dumps(s, ensure_ascii=False), now))
        for case_id, c in (s.get("cases") or {}).items():
            done = (c.get("maxStep") or 1) >= 10
            status = "disputed" if c.get("disputed") else ("completed" if done else "in_progress")
            prev = con.execute("SELECT status, started_at FROM attempts WHERE code=? AND case_id=?",
                               (code, case_id)).fetchone()
            if prev and prev["status"] == "confirmed":
                status = "confirmed"
            con.execute("""INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(code, case_id) DO UPDATE SET step=excluded.step, max_step=excluded.max_step,
                score=excluded.score, grade=excluded.grade, status=excluded.status, answers=excluded.answers,
                updated_at=excluded.updated_at, completed_at=COALESCE(attempts.completed_at, excluded.completed_at)""",
                        (code, case_id, c.get("step"), c.get("maxStep"), c.get("score"), c.get("grade"), status,
                         json.dumps(c, ensure_ascii=False), prev["started_at"] if prev else now, now,
                         now if done else None))
    return {"ok": True}


class Event(BaseModel):
    case_id: str | None = None
    step: int | None = None
    type: str
    payload: dict | None = None


@app.post("/api/events")
def event(body: Event, user=Depends(current)):
    """События для исследования: переходы к ИИ-репетитору, запуски кода, время на шаг."""
    with db.connect() as con:
        con.execute("INSERT INTO events(code,case_id,step,type,payload,ts) VALUES(?,?,?,?,?,?)",
                    (user["code"], body.case_id, body.step, body.type[:40],
                     json.dumps(body.payload or {}, ensure_ascii=False), time.time()))
    return {"ok": True}


class Diag(BaseModel):
    variant: str
    answers: list
    pct: dict


@app.post("/api/diagnostic")
def diagnostic(body: Diag, user=Depends(current)):
    with db.connect() as con:
        con.execute("INSERT INTO diagnostics(code,variant,answers,pct,ts) VALUES(?,?,?,?,?)",
                    (user["code"], body.variant[:2], json.dumps(body.answers),
                     json.dumps(body.pct, ensure_ascii=False), time.time()))
    return {"ok": True}


# ---------- оспаривание оценки ----------
class DisputeIn(BaseModel):
    case_id: str
    step: str
    text: str
    ai_score: int | None = None


@app.post("/api/disputes")
def open_dispute(body: DisputeIn, user=Depends(current)):
    with db.connect() as con:
        con.execute("INSERT INTO disputes(code,case_id,step,text,ai_score,created_at) VALUES(?,?,?,?,?,?)",
                    (user["code"], body.case_id, body.step[:60], body.text[:4000], body.ai_score, time.time()))
        db.audit(con, user["code"], "dispute_open", {"case": body.case_id, "step": body.step})
    return {"ok": True}


@app.get("/api/disputes/mine")
def my_disputes(user=Depends(current)):
    with db.connect() as con:
        rows = con.execute("SELECT id,case_id,step,status,decision,new_score,reason,created_at,resolved_at "
                           "FROM disputes WHERE code=? ORDER BY id DESC", (user["code"],)).fetchall()
    return [dict(r) for r in rows]


# ---------- преподаватель ----------
@app.get("/api/teacher/overview")
def overview(t=Depends(teacher)):
    with db.connect() as con:
        people = con.execute("""SELECT p.code, p.first_name, p.last_name, p.role, p.grp, a.case_id, a.step, a.max_step, a.score, a.grade,
            a.status, a.updated_at,
            (SELECT COUNT(*) FROM events e WHERE e.code=p.code AND e.type='tutor_open') AS tutor_opens
            FROM participants p LEFT JOIN attempts a ON a.code=p.code
            WHERE p.role!='teacher' ORDER BY p.grp, p.code""").fetchall()
        disputes = con.execute("SELECT d.*, p.first_name, p.last_name FROM disputes d LEFT JOIN participants p "
                               "ON p.code=d.code WHERE d.status='open' ORDER BY d.created_at").fetchall()
    return {"people": [dict(r) for r in people], "disputes": [dict(r) for r in disputes]}


class Resolve(BaseModel):
    decision: str          # 'keep' — оставить оценку, 'change' — изменить
    new_score: int | None = None
    reason: str


@app.post("/api/teacher/disputes/{dispute_id}")
def resolve(dispute_id: int, body: Resolve, t=Depends(teacher)):
    if not body.reason.strip():
        raise HTTPException(400, "Нужно обоснование решения")
    with db.connect() as con:
        d = con.execute("SELECT * FROM disputes WHERE id=?", (dispute_id,)).fetchone()
        if not d:
            raise HTTPException(404, "Обращение не найдено")
        con.execute("UPDATE disputes SET status='resolved', decision=?, new_score=?, reason=?, resolved_by=?, "
                    "resolved_at=? WHERE id=?",
                    (body.decision, body.new_score, body.reason[:2000], t["code"], time.time(), dispute_id))
        con.execute("UPDATE attempts SET status='confirmed' WHERE code=? AND case_id=?", (d["code"], d["case_id"]))
        db.audit(con, t["code"], "dispute_resolve",
                 {"id": dispute_id, "decision": body.decision, "new_score": body.new_score})
    return {"ok": True}


@app.post("/api/teacher/confirm/{code}/{case_id}")
def confirm(code: str, case_id: str, t=Depends(teacher)):
    with db.connect() as con:
        con.execute("UPDATE attempts SET status='confirmed' WHERE code=? AND case_id=? AND status='completed'",
                    (code, case_id))
        db.audit(con, t["code"], "confirm", {"code": code, "case": case_id})
    return {"ok": True}


class ImportIn(BaseModel):
    csv: str


@app.post("/api/teacher/participants/import")
def import_participants(body: ImportIn, t=Depends(teacher)):
    """CSV code;role;group;lang из панели преподавателя. Пароли возвращаются один раз и нигде не хранятся."""
    if len(body.csv) > 500_000:
        raise HTTPException(400, "Файл слишком большой")
    res = participants.import_rows(participants.parse_csv(body.csv), t["code"])
    return {"added": res.added, "skipped": res.skipped, "errors": res.errors}


@app.post("/api/teacher/participants/{code}/reset")
def reset_participant(code: str, t=Depends(teacher)):
    if code.strip().upper() == t["code"]:
        raise HTTPException(400, "Свой пароль так сбросить нельзя")
    pwd = participants.reset_password(code, t["code"])
    if not pwd:
        raise HTTPException(404, "Участник не найден")
    return {"code": code.strip().upper(), "password": pwd}


class GroupIn(BaseModel):
    group: str
    count: int
    role: str = "student"
    lang: str = "kk"


@app.post("/api/teacher/participants/group")
def create_group(body: GroupIn, t=Depends(teacher)):
    """«Создать группу»: коды P-1001… выдаются автоматически, пароли возвращаются один раз."""
    group = body.group.strip()
    if not group or len(group) > 30:
        raise HTTPException(400, "Укажите название группы (до 30 символов)")
    if not 1 <= body.count <= participants.MAX_GROUP:
        raise HTTPException(400, f"Количество — от 1 до {participants.MAX_GROUP}")
    if body.role not in ("student", "specialist") or body.lang not in participants.LANGS:
        raise HTTPException(400, "Неверная роль или язык")
    res = participants.create_group(group, body.count, body.role, body.lang, t["code"])
    return {"added": res.added, "skipped": res.skipped, "errors": res.errors}


EXPORTS = {
    "attempts": "SELECT code, case_id, step, max_step, score, grade, status, started_at, updated_at, completed_at FROM attempts",
    "events": "SELECT code, case_id, step, type, payload, ts FROM events",
    "diagnostics": "SELECT code, variant, answers, pct, ts FROM diagnostics",
    "disputes": "SELECT code, case_id, step, ai_score, status, decision, new_score, reason, created_at, resolved_at FROM disputes",
}


@app.get("/api/teacher/export/{kind}.csv")
def export(kind: str, t=Depends(teacher)):
    """Выгрузка для анализа — только коды участников, без ФИО."""
    if kind not in EXPORTS:
        raise HTTPException(404)
    with db.connect() as con:
        rows = con.execute(EXPORTS[kind]).fetchall()
        db.audit(con, t["code"], "export", kind)
    buf = io.StringIO()
    buf.write("\ufeff")                       # чтобы Excel правильно открыл кириллицу
    w = csv.writer(buf, delimiter=";")
    if rows:
        w.writerow(rows[0].keys())
        w.writerows([tuple(r) for r in rows])
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": f'attachment; filename="ai-biostat-{kind}.csv"'})


# ---------- страница ----------
@app.get("/")
def index():
    return FileResponse(os.path.join(STATIC, "index.html"))


app.mount("/static", StaticFiles(directory=STATIC), name="static")
