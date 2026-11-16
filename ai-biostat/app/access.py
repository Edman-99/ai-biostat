"""Какие группы видит преподаватель.

teacher_groups(teacher, grp): за преподавателем закреплены группы; grp='*' — главный преподаватель, видит всех.
Преподаватель без закреплённых групп не видит никого (безопаснее, чем «видит всех» по умолчанию).
Закрепляет главный преподаватель: `aib-participants assign T-0002 "227 Медицина" …` на сервере.
"""
ALL = "*"


def groups_of(con, teacher_code: str) -> set[str] | None:
    """None — видит все группы; иначе множество групп (может быть пустым)."""
    groups = {r["grp"] for r in con.execute("SELECT grp FROM teacher_groups WHERE teacher=?", (teacher_code,))}
    return None if ALL in groups else groups


def is_admin(con, teacher_code: str) -> bool:
    return groups_of(con, teacher_code) is None


def group_filter(scope: set[str] | None, column: str = "grp") -> tuple[str, list]:
    """SQL-условие «группа видна» и параметры к нему."""
    if scope is None:
        return "1=1", []
    if not scope:
        return "0=1", []
    return f"{column} IN ({','.join('?' * len(scope))})", sorted(scope)


def code_visible(con, scope: set[str] | None, code: str) -> bool:
    """Участник (студент/специалист) виден преподавателю? Других преподавателей видит только главный."""
    row = con.execute("SELECT role, grp FROM participants WHERE code=?", (code.strip().upper(),)).fetchone()
    if not row:
        return False
    if scope is None:
        return True
    return row["role"] != "teacher" and row["grp"] in scope


def assign(con, teacher_code: str, groups: list[str]) -> None:
    for g in groups:
        con.execute("INSERT OR IGNORE INTO teacher_groups(teacher, grp) VALUES(?,?)", (teacher_code, g.strip()))


def unassign(con, teacher_code: str, groups: list[str]) -> None:
    for g in groups:
        con.execute("DELETE FROM teacher_groups WHERE teacher=? AND grp=?", (teacher_code, g.strip()))


def all_assignments(con) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for r in con.execute("""SELECT p.code, tg.grp FROM participants p
                            LEFT JOIN teacher_groups tg ON tg.teacher=p.code
                            WHERE p.role='teacher' ORDER BY p.code, tg.grp"""):
        out.setdefault(r["code"], [])
        if r["grp"]:
            out[r["code"]].append(r["grp"])
    return out
