"""Управление участниками пилота.

  python tools/participants.py import участники.csv     — добавить участников и выдать пароли
  python tools/participants.py reset P-0142              — выдать новый пароль одному участнику
  python tools/participants.py list                      — показать всех участников

Формат участники.csv (разделитель ; или ,):  code;role;group;lang
  role: student | specialist | teacher      lang: kk | ru | en
ФИО в систему НЕ вносятся. Таблицу «код — ФИО» автор хранит отдельно.
Пароли сохраняются в файл пароли_<дата>.csv — его нужно распечатать/раздать и затем удалить.
"""
import csv, sys, os, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app import db
from app.security import hash_password, new_password


def _read(path):
    with open(path, encoding="utf-8-sig") as f:
        sample = f.read(2048); f.seek(0)
        delim = ";" if sample.count(";") >= sample.count(",") else ","
        return list(csv.DictReader(f, delimiter=delim))


def _save_passwords(rows):
    out = f"пароли_{time.strftime('%Y-%m-%d_%H%M')}.csv"
    with open(out, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["code", "password", "group", "role"])
        w.writerows(rows)
    print(f"Пароли сохранены в {out}. Раздайте их участникам и удалите файл.")


def cmd_import(path):
    db.init()
    added, skipped, out = 0, 0, []
    with db.connect() as con:
        for r in _read(path):
            code = (r.get("code") or "").strip().upper()
            role = (r.get("role") or "student").strip()
            if not code:
                continue
            if role not in ("student", "specialist", "teacher"):
                print(f"Пропущен {code}: роль «{role}» не student/specialist/teacher"); continue
            if con.execute("SELECT 1 FROM participants WHERE code=?", (code,)).fetchone():
                skipped += 1; continue
            pwd = new_password(); h, salt = hash_password(pwd)
            con.execute("INSERT INTO participants(code,pwd_hash,salt,role,grp,lang,created_at) VALUES(?,?,?,?,?,?,?)",
                        (code, h, salt, role, (r.get("group") or "").strip(), (r.get("lang") or "kk").strip(), time.time()))
            out.append([code, pwd, r.get("group", ""), role]); added += 1
        db.audit(con, "admin", "import", {"added": added, "skipped": skipped})
    print(f"Добавлено: {added}, уже были: {skipped}")
    if out:
        _save_passwords(out)


def cmd_reset(code):
    code = code.strip().upper()
    pwd = new_password(); h, salt = hash_password(pwd)
    with db.connect() as con:
        n = con.execute("UPDATE participants SET pwd_hash=?, salt=? WHERE code=?", (h, salt, code)).rowcount
        con.execute("DELETE FROM sessions WHERE code=?", (code,))
        db.audit(con, "admin", "reset", code)
    print(f"Новый пароль для {code}: {pwd}" if n else f"Участник {code} не найден")


def cmd_list():
    with db.connect() as con:
        for r in con.execute("SELECT code, role, grp, lang, active FROM participants ORDER BY grp, code"):
            print(*tuple(r), sep="\t")


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "import":
        cmd_import(sys.argv[2])
    elif len(sys.argv) >= 3 and sys.argv[1] == "reset":
        cmd_reset(sys.argv[2])
    elif len(sys.argv) >= 2 and sys.argv[1] == "list":
        cmd_list()
    else:
        print(__doc__)
