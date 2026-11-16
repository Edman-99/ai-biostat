"""AI-Biostat — сервер пилотной версии.
Запуск:  uvicorn app.main:app --host 0.0.0.0 --port 8000
"""
import csv, io, json, os, re, time
from fastapi import FastAPI, HTTPException, Request, Response, Depends
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from . import access, db, participants, tutor
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
    """Преподаватель + scope: None — главный (видит всех), иначе множество закреплённых групп."""
    if user["role"] != "teacher":
        raise HTTPException(403, "Доступно только преподавателю")
    with db.connect() as con:
        user["scope"] = access.groups_of(con, user["code"])
    return user


def require_visible(con, t, code: str):
    if not access.code_visible(con, t["scope"], code):
        raise HTTPException(404, "Участник не найден среди ваших групп")


def require_admin(t):
    if t["scope"] is not None:
        raise HTTPException(403, "Доступно только главному преподавателю")


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
    out = {"code": u["code"], "role": u["role"], "group": u["grp"], "lang": u["lang"],
           "first_name": u.get("first_name") or "", "last_name": u.get("last_name") or ""}
    if u["role"] == "teacher":                 # какие группы видит преподаватель (null — все)
        with db.connect() as con:
            scope = access.groups_of(con, u["code"])
        out["scope"] = None if scope is None else sorted(scope)
    else:                                      # итоговая диагностика открыта для группы студента?
        with db.connect() as con:
            out["exit_open"] = _exit_open(con, u["grp"])
            out["survey_open"] = _survey_open(con, u["grp"])
    return out


def _survey_open(con, grp) -> bool:
    return bool(grp) and con.execute("SELECT 1 FROM survey_open WHERE grp=?", (grp,)).fetchone() is not None


def _exit_open(con, grp) -> bool:
    return bool(grp) and con.execute("SELECT 1 FROM exit_open WHERE grp=?", (grp,)).fetchone() is not None


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
    """Вариант A — входная (один раз в начале), B — итоговая (только когда преподаватель открыл её для группы)."""
    variant = body.variant.strip().upper()[:1]
    if variant not in ("A", "B"):
        raise HTTPException(400, "Неизвестный вариант диагностики")
    with db.connect() as con:
        if variant == "B" and not _exit_open(con, user["grp"]):
            raise HTTPException(403, "Итоговая диагностика ещё не открыта для вашей группы")
        con.execute("INSERT INTO diagnostics(code,variant,answers,pct,ts) VALUES(?,?,?,?,?)",
                    (user["code"], variant, json.dumps(body.answers),
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
    cond, args = access.group_filter(t["scope"], "p.grp")
    with db.connect() as con:
        people = con.execute("""SELECT p.code, p.first_name, p.last_name, p.role, p.grp, a.case_id, a.step, a.max_step, a.score, a.grade,
            a.status, a.updated_at,
            (SELECT COUNT(*) FROM events e WHERE e.code=p.code AND e.type='tutor_open')
              + (SELECT COUNT(*) FROM tutor_messages tm WHERE tm.code=p.code AND tm.role='user') AS tutor_opens
            FROM participants p LEFT JOIN attempts a ON a.code=p.code
            WHERE p.role!='teacher' AND """ + cond + """ ORDER BY p.grp, p.code""", args).fetchall()
        disputes = con.execute("SELECT d.*, p.first_name, p.last_name FROM disputes d LEFT JOIN participants p "
                               "ON p.code=d.code WHERE d.status='open' AND " + cond + " ORDER BY d.created_at", args).fetchall()
    return {"people": [dict(r) for r in people], "disputes": [dict(r) for r in disputes]}


def _visible(t, column="code") -> tuple[str, list]:
    """Условие «участник из групп этого преподавателя» для любой таблицы с колонкой code."""
    if t["scope"] is None:
        return "1=1", []
    cond, args = access.group_filter(t["scope"], "grp")
    return f"{column} IN (SELECT code FROM participants WHERE role!='teacher' AND {cond})", args


def _json(text, default):
    try:
        return json.loads(text) if text else default
    except ValueError:
        return default


@app.get("/api/teacher/analytics")
def analytics(t=Depends(teacher)):
    """Сырьё для сводки «Аналитика»: только коды, без ФИО. Проценты по шагам считает браузер (GroupAnalytics)."""
    cond, args = access.group_filter(t["scope"], "p.grp")
    vis, vargs = _visible(t)
    with db.connect() as con:
        people = con.execute("""SELECT p.code, p.role, p.grp, s.updated_at AS last_active
            FROM participants p LEFT JOIN state s ON s.code=p.code
            WHERE p.role!='teacher' AND p.active=1 AND """ + cond, args).fetchall()
        attempts = con.execute("SELECT code, case_id, status, score, max_step, answers FROM attempts WHERE " + vis,
                               vargs).fetchall()
        diags = con.execute("SELECT code, variant, pct FROM diagnostics WHERE " + vis + " ORDER BY ts", vargs).fetchall()
        states = con.execute("SELECT code, json FROM state WHERE " + vis, vargs).fetchall()
    first_diag, first_exit = {}, {}
    for r in diags:                       # первая попытка варианта A — входная, варианта B — итоговая
        (first_exit if r["variant"] == "B" else first_diag).setdefault(r["code"], _json(r["pct"], {}))
    trainer = {}
    for r in states:
        tr = _json(r["json"], {}).get("trainer")
        if tr:
            trainer[r["code"]] = tr
    return {
        "people": [dict(r) for r in people],
        "attempts": [{"code": r["code"], "case_id": r["case_id"], "status": r["status"], "score": r["score"],
                      "max_step": r["max_step"], "progress": _json(r["answers"], None)} for r in attempts],
        "diagnostics": first_diag,
        "exit": first_exit,
        "trainer": trainer,
    }


@app.get("/api/teacher/teachers")
def teachers(t=Depends(teacher)):
    """Только главному: преподаватели и закреплённые за ними группы ('*' — все)."""
    require_admin(t)
    with db.connect() as con:
        return [{"code": c, "groups": g} for c, g in access.all_assignments(con).items()]


# ---------- опросник обратной связи ----------
SURVEY_KEY = re.compile(r"^[a-z][a-z0-9_]{0,39}$")


def sus_score(answers: dict):
    """SUS (System Usability Scale): sus1..sus10 по шкале 1–5 → 0–100; None, если ответов не хватает."""
    vals = [answers.get(f"sus{i}") for i in range(1, 11)]
    if any(not isinstance(v, int) or not 1 <= v <= 5 for v in vals):
        return None
    return sum((v - 1) if i % 2 == 0 else (5 - v) for i, v in enumerate(vals)) * 2.5


class SurveyIn(BaseModel):
    answers: dict


@app.get("/api/survey/mine")
def survey_mine(user=Depends(current)):
    with db.connect() as con:
        r = con.execute("SELECT answers, sus, ts FROM survey_responses WHERE code=?", (user["code"],)).fetchone()
    return {"done": bool(r), "sus": r["sus"] if r else None, "ts": r["ts"] if r else None}


@app.post("/api/survey")
def survey_submit(body: SurveyIn, user=Depends(current)):
    """Анкета обратной связи. Студенту/специалисту — когда преподаватель открыл её группе; преподавателю — всегда.
    Повторная отправка заменяет ответы. Балл SUS считает сервер."""
    a = body.answers
    if user["role"] != "teacher":
        with db.connect() as con:
            if not _survey_open(con, user["grp"]):
                raise HTTPException(403, "Опросник ещё не открыт для вашей группы")
    if not a or len(a) > 80 or any(not isinstance(k, str) or not SURVEY_KEY.match(k) for k in a) or any(
            not ((isinstance(v, int) and not isinstance(v, bool) and 0 <= v <= 5) or (isinstance(v, str) and len(v) <= 2000))
            for v in a.values()):
        raise HTTPException(400, "Неверный формат ответов")
    sus = sus_score(a)
    with db.connect() as con:
        con.execute("INSERT INTO survey_responses(code, role, grp, answers, sus, ts) VALUES(?,?,?,?,?,?) ON CONFLICT(code) "
                    "DO UPDATE SET answers=excluded.answers, sus=excluded.sus, ts=excluded.ts",
                    (user["code"], user["role"], user["grp"], json.dumps(a, ensure_ascii=False), sus, time.time()))
    return {"ok": True, "sus": sus}


@app.get("/api/teacher/survey")
def survey_status(t=Depends(teacher)):
    """По группам преподавателя: сколько ответили, средний SUS, открыт ли опросник."""
    cond, args = access.group_filter(t["scope"], "p.grp")
    with db.connect() as con:
        rows = con.execute(f"""SELECT p.grp, COUNT(*) AS people, COUNT(r.code) AS done, ROUND(AVG(r.sus), 1) AS sus_avg,
              EXISTS(SELECT 1 FROM survey_open o WHERE o.grp=p.grp) AS open
            FROM participants p LEFT JOIN survey_responses r ON r.code=p.code
            WHERE p.role!='teacher' AND p.active=1 AND COALESCE(p.grp,'')!='' AND {cond}
            GROUP BY p.grp ORDER BY p.grp""", args).fetchall()
        mine = con.execute("SELECT sus FROM survey_responses WHERE code=?", (t["code"],)).fetchone()
    return {"groups": [dict(r) | {"open": bool(r["open"])} for r in rows], "mine_done": bool(mine)}


class SurveyToggle(BaseModel):
    group: str
    open: bool


@app.post("/api/teacher/survey/open")
def survey_toggle(body: SurveyToggle, t=Depends(teacher)):
    group = body.group.strip()
    if t["scope"] is not None and group not in t["scope"]:
        raise HTTPException(403, "Группа не закреплена за вами")
    with db.connect() as con:
        if not con.execute("SELECT 1 FROM participants WHERE grp=? AND role!='teacher'", (group,)).fetchone():
            raise HTTPException(404, "Такой группы нет")
        if body.open:
            con.execute("INSERT OR IGNORE INTO survey_open(grp, opened_by, opened_at) VALUES(?,?,?)", (group, t["code"], time.time()))
        else:
            con.execute("DELETE FROM survey_open WHERE grp=?", (group,))
        db.audit(con, t["code"], "survey_open" if body.open else "survey_close", group)
    return {"ok": True}


# ---------- ИИ-репетитор ----------
class TutorMsg(BaseModel):
    role: str
    content: str


class TutorIn(BaseModel):
    case_id: str | None = None
    step: int | None = None
    lang: str = "ru"
    context: str = ""            # название кейса и шага на языке студента (для промпта)
    messages: list[TutorMsg]


@app.get("/api/tutor/status")
def tutor_status(user=Depends(current)):
    """Включён ли встроенный репетитор и сколько сообщений осталось сегодня."""
    with db.connect() as con:
        used = _tutor_used_today(con, user["code"])
    return {"enabled": tutor.enabled(), "left": max(0, tutor.DAILY_LIMIT - used), "limit": tutor.DAILY_LIMIT}


def _tutor_used_today(con, code) -> int:
    since = time.time() - 24 * 3600
    return con.execute("SELECT COUNT(*) FROM tutor_messages WHERE code=? AND role='user' AND ts>?", (code, since)).fetchone()[0]


@app.post("/api/tutor")
def tutor_chat(body: TutorIn, user=Depends(current)):
    """Сообщение студента → ответ Claude Haiku 5.5. Диалог сохраняется для исследования (только код участника)."""
    if not tutor.enabled():
        raise HTTPException(503, "Встроенный репетитор не настроен")
    if body.step in tutor.BLOCKED_STEPS and body.case_id:
        raise HTTPException(403, "На этом шаге репетитор не используется")
    msgs = [m for m in body.messages if m.role in ("user", "assistant") and m.content.strip()][-tutor.HISTORY:]
    while msgs and msgs[0].role != "user":
        msgs = msgs[1:]
    if not msgs or msgs[-1].role != "user":
        raise HTTPException(400, "Нет вопроса")
    question = msgs[-1].content.strip()
    if len(question) > tutor.MAX_CHARS:
        raise HTTPException(400, f"Слишком длинное сообщение (до {tutor.MAX_CHARS} символов)")
    with db.connect() as con:
        if _tutor_used_today(con, user["code"]) >= tutor.DAILY_LIMIT:
            raise HTTPException(429, "Лимит сообщений репетитору на сегодня исчерпан")
        con.execute("INSERT INTO tutor_messages(code, case_id, step, role, content, ts) VALUES(?,?,?,?,?,?)",
                    (user["code"], body.case_id, body.step, "user", question, time.time()))
    lang_name = {"kk": "қазақ", "ru": "русский", "en": "English"}.get(body.lang, body.lang)
    context = (body.context or "раздел «AI-репетитор», вне кейса")[:300] + f". Язык интерфейса студента: {lang_name}."
    try:
        r = tutor.ask([{"role": m.role, "content": m.content[:tutor.MAX_CHARS]} for m in msgs], context)
    except Exception as e:                     # сеть / лимиты API — студенту понятное сообщение, подробности в журнал
        print("tutor error:", type(e).__name__, str(e)[:300], flush=True)
        raise HTTPException(502, "Репетитор временно недоступен, попробуйте через минуту")
    text = r["text"] or ("Не могу ответить на этот вопрос. Переформулируйте его, пожалуйста, по теме курса." if r["refused"] else "")
    with db.connect() as con:
        con.execute("INSERT INTO tutor_messages(code, case_id, step, role, content, input_tokens, output_tokens, ts) "
                    "VALUES(?,?,?,?,?,?,?,?)", (user["code"], body.case_id, body.step, "assistant", text,
                                                r["input_tokens"], r["output_tokens"], time.time()))
        left = max(0, tutor.DAILY_LIMIT - _tutor_used_today(con, user["code"]))
    return {"reply": text, "left": left}


# ---------- редактор кейсов: правки текстов поверх кейсов из кода ----------
CASE_IDS = {"1", "4", "21", "22", "23"}
REVIEW_STATUSES = ("draft", "biostat", "eduExpert", "published")
EDIT_KEY = re.compile(r"^[a-z][A-Za-z]*(\.[A-Za-z0-9]+){0,3}$")   # путь поля, напр. method.options.2


def _current_edits(con):
    """Последняя правка по каждому (кейс, язык): {case_id: {lang: {путь: текст}}}."""
    rows = con.execute("""SELECT e.case_id, e.lang, e.texts FROM case_edits e
        JOIN (SELECT case_id, lang, MAX(id) AS id FROM case_edits GROUP BY case_id, lang) m ON m.id = e.id""").fetchall()
    out = {}
    for r in rows:
        texts = _json(r["texts"], {})
        if texts:
            out.setdefault(r["case_id"], {})[r["lang"]] = texts
    return out


@app.get("/api/cases/edits")
def case_edits(user=Depends(current)):
    """Правки текстов кейсов — нужны всем, кто проходит кейсы (подставляются поверх исходного текста)."""
    with db.connect() as con:
        return _current_edits(con)


@app.get("/api/teacher/cases")
def cases_overview(t=Depends(teacher)):
    with db.connect() as con:
        stat = {r["case_id"]: dict(r) for r in con.execute(
            "SELECT case_id, COUNT(*) AS saves, MAX(ts) AS last_ts FROM case_edits GROUP BY case_id")}
        review = {r["case_id"]: dict(r) for r in con.execute("SELECT * FROM case_review")}
    return [{"case_id": c, "saves": stat.get(c, {}).get("saves", 0), "last_ts": stat.get(c, {}).get("last_ts"),
             "status": review.get(c, {}).get("status", "draft"), "note": review.get(c, {}).get("note") or "",
             "status_by": review.get(c, {}).get("author"), "status_ts": review.get(c, {}).get("ts")}
            for c in sorted(CASE_IDS, key=int)]


@app.get("/api/teacher/cases/{case_id}/history")
def case_history(case_id: str, t=Depends(teacher)):
    with db.connect() as con:
        rows = con.execute("SELECT id, lang, texts, author, ts FROM case_edits WHERE case_id=? ORDER BY id DESC LIMIT 200",
                           (case_id,)).fetchall()
    return [{"id": r["id"], "lang": r["lang"], "texts": _json(r["texts"], {}), "author": r["author"], "ts": r["ts"]} for r in rows]


class CaseTexts(BaseModel):
    texts: dict


@app.put("/api/teacher/cases/{case_id}/{lang}")
def save_case_texts(case_id: str, lang: str, body: CaseTexts, t=Depends(teacher)):
    """Сохранить правки одного языка целиком (новая версия; {} — вернуть исходные тексты). Только главный преподаватель."""
    require_admin(t)
    if case_id not in CASE_IDS or lang not in participants.LANGS:
        raise HTTPException(404, "Нет такого кейса или языка")
    texts = body.texts
    if len(texts) > 400 or any(not isinstance(k, str) or not EDIT_KEY.match(k) or not isinstance(v, str) or len(v) > 5000
                               for k, v in texts.items()):
        raise HTTPException(400, "Неверный формат правок")
    with db.connect() as con:
        con.execute("INSERT INTO case_edits(case_id, lang, texts, author, ts) VALUES(?,?,?,?,?)",
                    (case_id, lang, json.dumps(texts, ensure_ascii=False), t["code"], time.time()))
        db.audit(con, t["code"], "case_edit", {"case": case_id, "lang": lang, "fields": len(texts)})
    return {"ok": True}


class CaseReview(BaseModel):
    status: str
    note: str = ""


@app.put("/api/teacher/case-status/{case_id}")
def set_case_status(case_id: str, body: CaseReview, t=Depends(teacher)):
    require_admin(t)
    if case_id not in CASE_IDS or body.status not in REVIEW_STATUSES:
        raise HTTPException(400, "Неверный кейс или статус")
    with db.connect() as con:
        con.execute("INSERT INTO case_review(case_id, status, note, author, ts) VALUES(?,?,?,?,?) ON CONFLICT(case_id) "
                    "DO UPDATE SET status=excluded.status, note=excluded.note, author=excluded.author, ts=excluded.ts",
                    (case_id, body.status, body.note[:2000], t["code"], time.time()))
        db.audit(con, t["code"], "case_status", {"case": case_id, "status": body.status})
    return {"ok": True}


@app.get("/api/teacher/diagnostics")
def diagnostics_status(t=Depends(teacher)):
    """По группам преподавателя: сколько прошли входную (A) и итоговую (B), открыта ли итоговая."""
    cond, args = access.group_filter(t["scope"], "p.grp")
    with db.connect() as con:
        rows = con.execute(f"""SELECT p.grp,
              COUNT(*) AS people,
              SUM(EXISTS(SELECT 1 FROM diagnostics d WHERE d.code=p.code AND d.variant='A')) AS entry_done,
              SUM(EXISTS(SELECT 1 FROM diagnostics d WHERE d.code=p.code AND d.variant='B')) AS exit_done,
              EXISTS(SELECT 1 FROM exit_open e WHERE e.grp=p.grp) AS exit_open
            FROM participants p
            WHERE p.role!='teacher' AND p.active=1 AND COALESCE(p.grp,'')!='' AND {cond}
            GROUP BY p.grp ORDER BY p.grp""", args).fetchall()
    return [dict(r) | {"exit_open": bool(r["exit_open"])} for r in rows]


class ExitToggle(BaseModel):
    group: str
    open: bool


@app.post("/api/teacher/diagnostics/exit")
def toggle_exit(body: ExitToggle, t=Depends(teacher)):
    """Открыть/закрыть итоговую диагностику группе (только своей; главный — любой)."""
    group = body.group.strip()
    if t["scope"] is not None and group not in t["scope"]:
        raise HTTPException(403, "Группа не закреплена за вами")
    with db.connect() as con:
        if not con.execute("SELECT 1 FROM participants WHERE grp=? AND role!='teacher'", (group,)).fetchone():
            raise HTTPException(404, "Такой группы нет")
        if body.open:
            con.execute("INSERT OR IGNORE INTO exit_open(grp, opened_by, opened_at) VALUES(?,?,?)", (group, t["code"], time.time()))
        else:
            con.execute("DELETE FROM exit_open WHERE grp=?", (group,))
        db.audit(con, t["code"], "exit_open" if body.open else "exit_close", group)
    return {"ok": True}


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
        require_visible(con, t, d["code"])
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
        require_visible(con, t, code)
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
    rows, denied = participants.parse_csv(body.csv), []
    if t["scope"] is not None:            # обычный преподаватель — только студенты/специалисты своих групп
        allowed = [r for r in rows if (r.get("role") or "student") != "teacher" and (r.get("group") or "") in t["scope"]]
        denied = [f"{r.get('code') or '?'}: группа «{r.get('group') or ''}» не закреплена за вами"
                  for r in rows if r not in allowed and (r.get("code") or "")]
        rows = allowed
    res = participants.import_rows(rows, t["code"])
    return {"added": res.added, "skipped": res.skipped, "errors": denied + res.errors}


@app.post("/api/teacher/participants/{code}/reset")
def reset_participant(code: str, t=Depends(teacher)):
    if code.strip().upper() == t["code"]:
        raise HTTPException(400, "Свой пароль так сбросить нельзя")
    with db.connect() as con:
        require_visible(con, t, code)
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
    if t["scope"] is not None and group not in t["scope"]:
        raise HTTPException(403, f"Группа «{group}» не закреплена за вами — обратитесь к главному преподавателю")
    res = participants.create_group(group, body.count, body.role, body.lang, t["code"])
    return {"added": res.added, "skipped": res.skipped, "errors": res.errors}


EXPORTS = {
    "attempts": "SELECT code, case_id, step, max_step, score, grade, status, started_at, updated_at, completed_at FROM attempts",
    "events": "SELECT code, case_id, step, type, payload, ts FROM events",
    "diagnostics": "SELECT code, variant, answers, pct, ts FROM diagnostics",
    "disputes": "SELECT code, case_id, step, ai_score, status, decision, new_score, reason, created_at, resolved_at FROM disputes",
    "tutor": "SELECT code, case_id, step, role, content, input_tokens, output_tokens, ts FROM tutor_messages",
}


@app.get("/api/teacher/export/survey.csv")
def export_survey(t=Depends(teacher)):
    """Опросник: одна строка на участника, ответы — по столбцам (код вопроса), SUS посчитан. Только коды.
    Ответы преподавателей видит только главный."""
    vis, vargs = _visible(t)
    with db.connect() as con:
        rows = con.execute(f"SELECT code, role, grp, sus, ts, answers FROM survey_responses WHERE {vis} ORDER BY role, grp, code",
                           vargs).fetchall()
        db.audit(con, t["code"], "export", "survey")
    parsed = [(r, _json(r["answers"], {})) for r in rows]
    keys = sorted({k for _, a in parsed for k in a}, key=lambda k: (k.startswith("open"), k))
    buf = io.StringIO()
    buf.write("\ufeff")
    w = csv.writer(buf, delimiter=";")
    w.writerow(["code", "role", "group", "sus", "ts", *keys])
    for r, a in parsed:
        w.writerow([r["code"], r["role"], r["grp"] or "", r["sus"] if r["sus"] is not None else "", r["ts"], *[a.get(k, "") for k in keys]])
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": 'attachment; filename="ai-biostat-survey.csv"'})


@app.get("/api/teacher/export/{kind}.csv")
def export(kind: str, t=Depends(teacher)):
    """Выгрузка для анализа — только коды участников, без ФИО."""
    if kind not in EXPORTS:
        raise HTTPException(404)
    with db.connect() as con:
        vis, vargs = _visible(t)
        rows = con.execute(f"SELECT * FROM ({EXPORTS[kind]}) WHERE {vis}", vargs).fetchall()
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
