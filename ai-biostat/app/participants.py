"""Участники пилота: импорт из CSV и новые пароли. Используется и панелью преподавателя (API), и tools/participants.py."""
import csv, io, time
from dataclasses import dataclass, field
from . import db
from .security import hash_password, new_password

ROLES = ("student", "specialist", "teacher")
LANGS = ("kk", "ru", "en")
MAX_ROWS = 2000


@dataclass
class ImportResult:
    added: list = field(default_factory=list)      # [{code, password, group, role}] — пароли показываются один раз
    skipped: list = field(default_factory=list)    # коды, которые уже есть
    errors: list = field(default_factory=list)     # «строка 5: …»


def parse_csv(text: str) -> list[dict]:
    """CSV со столбцами code;role;group;lang (разделитель ; или ,). BOM от Excel убирается."""
    text = text.lstrip("﻿")
    sample = text[:2048]
    delim = ";" if sample.count(";") >= sample.count(",") else ","
    rows = csv.DictReader(io.StringIO(text), delimiter=delim)
    return [{(k or "").strip().lower(): (v or "").strip() for k, v in r.items()} for r in rows]


def import_rows(rows: list[dict], actor: str) -> ImportResult:
    res = ImportResult()
    if len(rows) > MAX_ROWS:
        res.errors.append(f"Слишком много строк ({len(rows)}), максимум {MAX_ROWS}")
        return res
    db.init()
    with db.connect() as con:
        for n, r in enumerate(rows, start=2):           # строка 1 — заголовок
            code = (r.get("code") or "").upper()
            role = r.get("role") or "student"
            lang = r.get("lang") or "kk"
            if not code:
                continue
            if len(code) > 20:
                res.errors.append(f"строка {n}: код «{code}» длиннее 20 символов"); continue
            if role not in ROLES:
                res.errors.append(f"строка {n}: {code} — роль «{role}», нужна student, specialist или teacher"); continue
            if lang not in LANGS:
                res.errors.append(f"строка {n}: {code} — язык «{lang}», нужен kk, ru или en"); continue
            if con.execute("SELECT 1 FROM participants WHERE code=?", (code,)).fetchone():
                res.skipped.append(code); continue
            pwd = new_password(); h, salt = hash_password(pwd)
            con.execute("INSERT INTO participants(code,pwd_hash,salt,role,grp,lang,created_at) VALUES(?,?,?,?,?,?,?)",
                        (code, h, salt, role, r.get("group") or "", lang, time.time()))
            res.added.append({"code": code, "password": pwd, "group": r.get("group") or "", "role": role})
        db.audit(con, actor, "import", {"added": len(res.added), "skipped": len(res.skipped), "errors": len(res.errors)})
    return res


def reset_password(code: str, actor: str) -> str | None:
    """Новый пароль; все открытые сессии участника закрываются. None — участник не найден."""
    code = code.strip().upper()
    pwd = new_password(); h, salt = hash_password(pwd)
    with db.connect() as con:
        n = con.execute("UPDATE participants SET pwd_hash=?, salt=? WHERE code=?", (h, salt, code)).rowcount
        if not n:
            return None
        con.execute("DELETE FROM sessions WHERE code=?", (code,))
        db.audit(con, actor, "reset", code)
    return pwd
