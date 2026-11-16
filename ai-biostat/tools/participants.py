"""Управление участниками пилота (то же можно делать в панели преподавателя → «Участники и выгрузка»).

  python tools/participants.py import участники.csv     — добавить участников и выдать пароли
  python tools/participants.py reset P-0142              — выдать новый пароль одному участнику
  python tools/participants.py list                      — показать всех участников
  python tools/participants.py assign T-0002 "227 Медицина" "224 Медицина"   — закрепить группы за преподавателем
  python tools/participants.py assign T-0001 "*"         — главный преподаватель (видит все группы)
  python tools/participants.py unassign T-0002 "224 Медицина"                — открепить группу
  python tools/participants.py teachers                  — преподаватели и их группы

Формат участники.csv (разделитель ; или ,):  code;role;group;lang
  role: student | specialist | teacher      lang: kk | ru | en
ФИО в систему НЕ вносятся. Таблицу «код — ФИО» автор хранит отдельно.
Пароли сохраняются в файл пароли_<дата>.csv — его нужно распечатать/раздать и затем удалить.
"""
import csv, sys, os, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app import access, db
from app.participants import import_rows, parse_csv, reset_password


def _save_passwords(rows):
    out = f"пароли_{time.strftime('%Y-%m-%d_%H%M')}.csv"
    with open(out, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["code", "password", "group", "role"])
        w.writerows([[r["code"], r["password"], r["group"], r["role"]] for r in rows])
    print(f"Пароли сохранены в {out}. Раздайте их участникам и удалите файл.")


def cmd_import(path):
    with open(path, encoding="utf-8-sig") as f:
        res = import_rows(parse_csv(f.read()), "admin")
    for e in res.errors:
        print("Пропущено —", e)
    print(f"Добавлено: {len(res.added)}, уже были: {len(res.skipped)}")
    if res.added:
        _save_passwords(res.added)


def cmd_reset(code):
    pwd = reset_password(code, "admin")
    print(f"Новый пароль для {code.strip().upper()}: {pwd}" if pwd else f"Участник {code} не найден")


def cmd_list():
    with db.connect() as con:
        for r in con.execute("SELECT code, role, grp, lang, active FROM participants ORDER BY grp, code"):
            print(*tuple(r), sep="\t")


def cmd_assign(code, groups, remove=False):
    code = code.strip().upper()
    db.init()
    with db.connect() as con:
        row = con.execute("SELECT role FROM participants WHERE code=?", (code,)).fetchone()
        if not row or row["role"] != "teacher":
            print(f"{code} — не преподаватель (сначала создайте: import с role=teacher)")
            return
        known = {r["grp"] for r in con.execute("SELECT DISTINCT grp FROM participants WHERE role!='teacher'")}
        unknown = [g for g in groups if g != access.ALL and g not in known]
        if unknown and not remove:
            print("Внимание: таких групп пока нет среди студентов:", ", ".join(unknown))
        (access.unassign if remove else access.assign)(con, code, groups)
        db.audit(con, "admin", "unassign" if remove else "assign", {"teacher": code, "groups": groups})
    cmd_teachers()


def cmd_teachers():
    db.init()
    with db.connect() as con:
        for code, groups in access.all_assignments(con).items():
            print(code, "\t", "ВСЕ ГРУППЫ" if access.ALL in groups else (", ".join(groups) or "— нет групп —"))


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] in ("assign", "unassign"):
        cmd_assign(sys.argv[2], sys.argv[3:], remove=sys.argv[1] == "unassign")
    elif len(sys.argv) >= 2 and sys.argv[1] == "teachers":
        cmd_teachers()
    elif len(sys.argv) >= 3 and sys.argv[1] == "import":
        cmd_import(sys.argv[2])
    elif len(sys.argv) >= 3 and sys.argv[1] == "reset":
        cmd_reset(sys.argv[2])
    elif len(sys.argv) >= 2 and sys.argv[1] == "list":
        cmd_list()
    else:
        print(__doc__)
