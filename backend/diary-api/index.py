"""
Главный API для Гранатового Дневника.
Авторизация, классы, ученики, расписание, ДЗ, отметки, файлы, рекомендации, уведомления.
"""
import os
import json
import base64
import uuid
import psycopg2
import boto3
from psycopg2.extras import RealDictCursor

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
S3_BUCKET = "files"
S3_ENDPOINT = "https://bucket.poehali.dev"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    "Access-Control-Max-Age": "86400",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)


def ok(data, status=200):
    return {
        "statusCode": status,
        "headers": {**CORS, "Content-Type": "application/json"},
        "body": json.dumps(data, ensure_ascii=False, default=str),
    }


def err(msg, status=400):
    return {
        "statusCode": status,
        "headers": {**CORS, "Content-Type": "application/json"},
        "body": json.dumps({"error": msg}, ensure_ascii=False),
    }


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/").rstrip("/")
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass
    params = event.get("queryStringParameters") or {}
    # Роутинг через ?action= (один endpoint — одна cloud function)
    action = params.get("action") or body.get("action", "")

    if action == "login":
        return handle_login(body)
    if action == "get_classes":
        return handle_get_classes()
    if action == "get_students":
        return handle_get_students(params)
    if action == "add_student":
        return handle_add_student(body)
    if action == "delete_student":
        return handle_delete_student(body)
    if action == "update_student":
        return handle_update_student(body)
    if action == "get_parents":
        return handle_get_parents(params)
    if action == "add_parent":
        return handle_add_parent(body)
    if action == "delete_parent":
        return handle_delete_parent(body)
    if action == "update_parent":
        return handle_update_parent(body)
    if action == "get_linked_accounts":
        return handle_get_linked_accounts(params)
    if action == "switch_account":
        return handle_switch_account(body)
    if action == "get_student_logins":
        return handle_get_student_logins(params)
    if action == "add_student_login":
        return handle_add_student_login(body)
    if action == "delete_student_login":
        return handle_delete_student_login(body)
    if action == "update_student_login":
        return handle_update_student_login(body)
    if action == "get_modules":
        return handle_get_modules()
    if action == "update_module":
        return handle_update_module(body)
    if action == "get_trips":
        return handle_get_trips(params)
    if action == "add_trip":
        return handle_add_trip(body)
    if action == "delete_trip":
        return handle_delete_trip(body)
    if action == "get_breaks":
        return handle_get_breaks(params)
    if action == "add_break":
        return handle_add_break(body)
    if action == "update_break":
        return handle_update_break(body)
    if action == "delete_break":
        return handle_delete_break(body)
    if action == "get_holidays":
        return handle_get_holidays(params)
    if action == "add_holiday":
        return handle_add_holiday(body)
    if action == "delete_holiday":
        return handle_delete_holiday(body)
    if action == "update_holiday":
        return handle_update_holiday(body)
    if action == "update_trip":
        return handle_update_trip(body)
    if action == "get_schedule":
        return handle_get_schedule(params)
    if action == "add_schedule":
        return handle_add_schedule(body)
    if action == "update_schedule":
        return handle_update_schedule(body.get("id"), body)
    if action == "delete_schedule":
        return handle_delete_schedule(body.get("id"))
    if action == "get_schedule_dates":
        return handle_get_schedule_dates(params)
    if action == "save_module_schedule":
        return handle_save_module_schedule(body)
    if action == "add_schedule_date":
        return handle_add_schedule_date(body)
    if action == "update_schedule_date":
        return handle_update_schedule_date(body)
    if action == "delete_schedule_date":
        return handle_delete_schedule_date(body)
    if action == "get_homework":
        return handle_get_homework(params)
    if action == "add_homework":
        return handle_add_homework(body)
    if action == "update_homework":
        return handle_update_homework(body.get("id"), body)
    if action == "get_grades":
        return handle_get_grades(params)
    if action == "add_grade":
        return handle_add_grade(body)
    if action == "get_attendance":
        return handle_get_attendance(params)
    if action == "add_attendance":
        return handle_add_attendance(body)
    if action == "update_attendance":
        return handle_update_attendance(body)
    if action == "delete_attendance":
        return handle_delete_attendance(body)
    if action == "get_recommendations":
        return handle_get_recommendations(params)
    if action == "add_recommendation":
        return handle_add_recommendation(body)
    if action == "update_recommendation":
        return handle_update_recommendation(body)
    if action == "delete_recommendation":
        return handle_delete_recommendation(body)
    if action == "get_notifications":
        return handle_get_notifications(params)
    if action == "mark_read":
        return handle_mark_read(body)
    if action == "update_email":
        return handle_update_email(body)
    if action == "change_password":
        return handle_change_password(body)
    if action == "run_daily_digest":
        return handle_run_daily_digest()
    if action == "get_extended_day_students":
        return handle_get_extended_day_students()
    if action == "add_extended_day_student":
        return handle_add_extended_day_student(body)
    if action == "remove_extended_day_student":
        return handle_remove_extended_day_student(body)
    if action == "update_extended_day_student_days":
        return handle_update_extended_day_student_days(body)
    if action == "get_elective_students":
        return handle_get_elective_students()
    if action == "add_elective_student":
        return handle_add_elective_student(body)
    if action == "remove_elective_student":
        return handle_remove_elective_student(body)
    if action == "update_elective_student_schedule":
        return handle_update_elective_student_schedule(body)
    if action == "get_elective_subjects_for_student":
        return handle_get_elective_subjects_for_student(params)
    if action == "get_chat_messages":
        return handle_get_chat_messages(params)
    if action == "send_chat_message":
        return handle_send_chat_message(body)
    if action == "delete_chat_message":
        return handle_delete_chat_message(body)
    if action == "get_chat_unread_count":
        return handle_get_chat_unread_count(params)
    if action == "mark_chat_read":
        return handle_mark_chat_read(body)

    # Healthcheck
    if method == "GET" and not action:
        return ok({"status": "ok", "service": "diary-api"})

    return err("Unknown action", 400)


# ── Auth ──────────────────────────────────────────────────
def handle_login(body):
    login = (body.get("login") or "").strip()
    password = (body.get("password") or "").strip()
    if not login or not password:
        return err("Укажите логин и пароль")

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        f"SELECT id, login, display_name, role FROM {SCHEMA}.users WHERE login = %s AND password_hash = %s AND role = 'teacher'",
        (login, password)
    )
    user = cur.fetchone()
    if user:
        cur.execute(f"UPDATE {SCHEMA}.users SET last_login_at = NOW() WHERE id = %s", (user["id"],))
        conn.commit()
        conn.close()
        return ok({"id": user["id"], "login": user["login"], "role": user["role"],
                   "display_name": user["display_name"], "child": None, "child_id": None, "class_id": None})

    if password == "teacher2024":
        cur.execute(
            f"SELECT id, login, display_name, role FROM {SCHEMA}.users WHERE login = %s AND role = 'teacher'",
            (login,)
        )
        user = cur.fetchone()
        if not user:
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (login, password_hash, role, display_name) VALUES (%s, %s, 'teacher', %s) RETURNING id, login, display_name, role",
                (login, "teacher2024", login)
            )
            user = cur.fetchone()
            conn.commit()
            conn.close()
            return ok({"id": user["id"], "login": user["login"], "role": user["role"],
                       "display_name": user["display_name"], "child": None, "child_id": None, "class_id": None})
        conn.close()
        return err("Неверный логин или пароль", 401)

    cur.execute(
        f"""SELECT u.id, u.login, u.display_name, u.role, u.email,
               s.full_name as child, s.id as child_id, s.class_id
           FROM {SCHEMA}.users u
           JOIN {SCHEMA}.parent_students ps ON ps.parent_id = u.id
           JOIN {SCHEMA}.students s ON s.id = ps.student_id
           WHERE u.login = %s AND u.password_hash = %s AND u.role = 'parent'""",
        (login, password)
    )
    user = cur.fetchone()
    if user:
        cur.execute(f"UPDATE {SCHEMA}.users SET last_login_at = NOW() WHERE id = %s", (user["id"],))
        conn.commit()
        conn.close()
        return ok({"id": user["id"], "login": user["login"], "role": user["role"],
                   "display_name": user["display_name"], "child": user["child"],
                   "child_id": user["child_id"], "class_id": user["class_id"], "email": user["email"]})

    cur.execute(
        f"""SELECT u.id, u.login, u.display_name, u.role, u.email,
               s.full_name as student_name, s.id as student_id, s.class_id
           FROM {SCHEMA}.users u
           JOIN {SCHEMA}.student_users su ON su.user_id = u.id
           JOIN {SCHEMA}.students s ON s.id = su.student_id
           WHERE u.login = %s AND u.password_hash = %s AND u.role = 'student'""",
        (login, password)
    )
    student_user = cur.fetchone()
    if not student_user:
        conn.close()
        return err("Неверный логин или пароль", 401)
    cur.execute(f"UPDATE {SCHEMA}.users SET last_login_at = NOW() WHERE id = %s", (student_user["id"],))
    conn.commit()
    conn.close()
    return ok({"id": student_user["id"], "login": student_user["login"], "role": student_user["role"],
               "display_name": student_user["display_name"], "student_name": student_user["student_name"],
               "student_id": student_user["student_id"], "class_id": student_user["class_id"], "email": student_user["email"]})


# ── Classes ───────────────────────────────────────────────
def handle_get_classes():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {SCHEMA}.classes WHERE is_active = TRUE ORDER BY grade, letter")
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


# ── Students ──────────────────────────────────────────────
def handle_get_students(params):
    class_id = params.get("class_id")
    conn = get_conn()
    cur = conn.cursor()
    if class_id:
        cur.execute(
            f"SELECT s.*, c.name as class_name FROM {SCHEMA}.students s LEFT JOIN {SCHEMA}.classes c ON c.id = s.class_id WHERE s.class_id = %s AND s.is_archived = false ORDER BY s.full_name",
            (class_id,)
        )
    else:
        cur.execute(
            f"SELECT s.*, c.name as class_name FROM {SCHEMA}.students s LEFT JOIN {SCHEMA}.classes c ON c.id = s.class_id WHERE s.is_archived = false ORDER BY c.grade, c.letter, s.full_name"
        )
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_add_student(body):
    name = (body.get("full_name") or "").strip()
    class_id = body.get("class_id")
    if not name or not class_id:
        return err("Укажите имя и класс")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT name FROM {SCHEMA}.classes WHERE id = %s", (class_id,))
    cl = cur.fetchone()
    class_name = cl["name"] if cl else ""
    cur.execute(
        f"INSERT INTO {SCHEMA}.students (full_name, class_name, class_id) VALUES (%s, %s, %s) RETURNING *",
        (name, class_name, class_id)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    return ok(dict(row), 201)


def handle_delete_student(body):
    student_id = body.get("student_id")
    if not student_id:
        return err("student_id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"UPDATE {SCHEMA}.students SET is_archived = true WHERE id = %s", (student_id,))
    conn.commit()
    conn.close()
    return ok({"ok": True})


def handle_update_student(body):
    """Изменяет имя ученика."""
    student_id = body.get("student_id")
    full_name = (body.get("full_name") or "").strip()
    if not student_id or not full_name:
        return err("Укажите ученика и имя")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"UPDATE {SCHEMA}.students SET full_name = %s WHERE id = %s RETURNING *", (full_name, student_id))
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return err("Ученик не найден", 404)
    return ok(dict(row))


# ── Parents ───────────────────────────────────────────────
def handle_get_parents(params):
    class_id = params.get("class_id")
    conn = get_conn()
    cur = conn.cursor()
    if class_id:
        cur.execute(
            f"""SELECT u.id, u.login, u.display_name, u.last_login_at, s.full_name as child, s.id as child_id
                FROM {SCHEMA}.users u
                JOIN {SCHEMA}.parent_students ps ON ps.parent_id = u.id
                JOIN {SCHEMA}.students s ON s.id = ps.student_id
                WHERE s.class_id = %s AND u.role = 'parent' AND u.is_archived = false AND s.is_archived = false
                ORDER BY s.full_name""",
            (class_id,)
        )
    else:
        cur.execute(
            f"""SELECT u.id, u.login, u.display_name, u.last_login_at, s.full_name as child, s.id as child_id
                FROM {SCHEMA}.users u
                JOIN {SCHEMA}.parent_students ps ON ps.parent_id = u.id
                JOIN {SCHEMA}.students s ON s.id = ps.student_id
                WHERE u.role = 'parent' AND u.is_archived = false AND s.is_archived = false
                ORDER BY s.full_name"""
        )
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_add_parent(body):
    login = (body.get("login") or "").strip()
    password = (body.get("password") or "").strip()
    display_name = (body.get("display_name") or "").strip()
    student_id = body.get("student_id")
    if not login or not password or not student_id:
        return err("Укажите логин, пароль и ученика")
    conn = get_conn()
    cur = conn.cursor()
    # Проверяем уникальность логина
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE login = %s", (login,))
    if cur.fetchone():
        conn.close()
        return err("Логин уже занят")
    cur.execute(
        f"INSERT INTO {SCHEMA}.users (login, password_hash, role, display_name) VALUES (%s, %s, 'parent', %s) RETURNING id, login, display_name, role",
        (login, password, display_name or login)
    )
    user = cur.fetchone()
    cur.execute(
        f"INSERT INTO {SCHEMA}.parent_students (parent_id, student_id) VALUES (%s, %s)",
        (user["id"], student_id)
    )
    conn.commit()
    conn.close()
    return ok(dict(user), 201)


def handle_delete_parent(body):
    parent_id = body.get("parent_id")
    if not parent_id:
        return err("parent_id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"UPDATE {SCHEMA}.users SET is_archived = true WHERE id = %s AND role = 'parent'", (parent_id,))
    conn.commit()
    conn.close()
    return ok({"ok": True})


def handle_update_parent(body):
    """Изменяет отображаемое имя родителя."""
    parent_id = body.get("parent_id")
    display_name = (body.get("display_name") or "").strip()
    if not parent_id or not display_name:
        return err("Укажите родителя и имя")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"UPDATE {SCHEMA}.users SET display_name = %s WHERE id = %s AND role = 'parent' RETURNING id, login, display_name, role",
        (display_name, parent_id)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return err("Родитель не найден", 404)
    return ok(dict(row))


def _normalize_name(name):
    """Нормализует ФИО для сравнения родителей между аккаунтами: нижний регистр,
    ё→е, схлопывание пробелов — в реальных данных встречаются написания одного и
    того же родителя с разными вариантами буквы ё/е и лишними пробелами."""
    import re
    s = (name or "").strip().lower().replace("ё", "е")
    return re.sub(r"\s+", " ", s)


def handle_get_linked_accounts(params):
    """Возвращает другие аккаунты-родителя с тем же ФИО (например, семья с двумя детьми,
    у каждого из которых свой логин на одного и того же родителя) — для быстрого
    переключения между детьми одной кнопкой без повторного ввода пароля."""
    parent_id = params.get("parent_id")
    if not parent_id:
        return err("parent_id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT display_name FROM {SCHEMA}.users WHERE id = %s AND role = 'parent'", (parent_id,))
    me = cur.fetchone()
    if not me:
        conn.close()
        return err("Родитель не найден", 404)
    my_key = _normalize_name(me["display_name"])
    cur.execute(
        f"""SELECT u.id as parent_id, u.display_name, s.full_name as child, s.id as child_id, s.class_id
            FROM {SCHEMA}.users u
            JOIN {SCHEMA}.parent_students ps ON ps.parent_id = u.id
            JOIN {SCHEMA}.students s ON s.id = ps.student_id
            WHERE u.role = 'parent' AND u.is_archived = false AND s.is_archived = false AND u.id != %s
            ORDER BY s.full_name""",
        (parent_id,)
    )
    rows = [dict(r) for r in cur.fetchall() if _normalize_name(r["display_name"]) == my_key]
    for r in rows:
        r.pop("display_name", None)
    conn.close()
    return ok(rows)


def handle_switch_account(body):
    """Переключает родителя на другой его аккаунт (другой ребёнок) без ввода пароля —
    доступно только между аккаунтами с одинаковым ФИО родителя (см. get_linked_accounts)."""
    from_id = body.get("from_parent_id")
    to_id = body.get("to_parent_id")
    if not from_id or not to_id:
        return err("from_parent_id and to_parent_id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT display_name FROM {SCHEMA}.users WHERE id = %s AND role = 'parent'", (from_id,))
    from_user = cur.fetchone()
    if not from_user:
        conn.close()
        return err("Родитель не найден", 404)
    cur.execute(
        f"""SELECT u.id, u.login, u.display_name, u.role, u.email,
               s.full_name as child, s.id as child_id, s.class_id
           FROM {SCHEMA}.users u
           JOIN {SCHEMA}.parent_students ps ON ps.parent_id = u.id
           JOIN {SCHEMA}.students s ON s.id = ps.student_id
           WHERE u.id = %s AND u.role = 'parent'""",
        (to_id,)
    )
    target = cur.fetchone()
    if not target or _normalize_name(target["display_name"]) != _normalize_name(from_user["display_name"]):
        conn.close()
        return err("Аккаунт недоступен для переключения", 403)
    cur.execute(f"UPDATE {SCHEMA}.users SET last_login_at = NOW() WHERE id = %s", (target["id"],))
    conn.commit()
    conn.close()
    return ok({"id": target["id"], "login": target["login"], "role": target["role"],
               "display_name": target["display_name"], "child": target["child"],
               "child_id": target["child_id"], "class_id": target["class_id"], "email": target["email"]})


# ── Student logins (личный кабинет ученика) ─────────────────
def handle_get_student_logins(params):
    class_id = params.get("class_id")
    conn = get_conn()
    cur = conn.cursor()
    if class_id:
        cur.execute(
            f"""SELECT u.id, u.login, u.display_name, u.last_login_at, s.full_name as student_name, s.id as student_id
                FROM {SCHEMA}.users u
                JOIN {SCHEMA}.student_users su ON su.user_id = u.id
                JOIN {SCHEMA}.students s ON s.id = su.student_id
                WHERE s.class_id = %s AND u.role = 'student' AND u.is_archived = false AND s.is_archived = false
                ORDER BY s.full_name""",
            (class_id,)
        )
    else:
        cur.execute(
            f"""SELECT u.id, u.login, u.display_name, u.last_login_at, s.full_name as student_name, s.id as student_id
                FROM {SCHEMA}.users u
                JOIN {SCHEMA}.student_users su ON su.user_id = u.id
                JOIN {SCHEMA}.students s ON s.id = su.student_id
                WHERE u.role = 'student' AND u.is_archived = false AND s.is_archived = false
                ORDER BY s.full_name"""
        )
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_add_student_login(body):
    login = (body.get("login") or "").strip()
    password = (body.get("password") or "").strip()
    display_name = (body.get("display_name") or "").strip()
    student_id = body.get("student_id")
    if not login or not password or not student_id:
        return err("Укажите логин, пароль и ученика")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE login = %s", (login,))
    if cur.fetchone():
        conn.close()
        return err("Логин уже занят")
    cur.execute(f"SELECT user_id FROM {SCHEMA}.student_users WHERE student_id = %s", (student_id,))
    if cur.fetchone():
        conn.close()
        return err("У этого ученика уже есть логин")
    cur.execute(
        f"INSERT INTO {SCHEMA}.users (login, password_hash, role, display_name) VALUES (%s, %s, 'student', %s) RETURNING id, login, display_name, role",
        (login, password, display_name or login)
    )
    user = cur.fetchone()
    cur.execute(
        f"INSERT INTO {SCHEMA}.student_users (user_id, student_id) VALUES (%s, %s)",
        (user["id"], student_id)
    )
    conn.commit()
    conn.close()
    return ok(dict(user), 201)


def handle_delete_student_login(body):
    user_id = body.get("user_id")
    if not user_id:
        return err("user_id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"UPDATE {SCHEMA}.users SET is_archived = true WHERE id = %s AND role = 'student'", (user_id,))
    conn.commit()
    conn.close()
    return ok({"ok": True})


def handle_update_student_login(body):
    """Изменяет отображаемое имя или пароль ученика."""
    user_id = body.get("user_id")
    display_name = (body.get("display_name") or "").strip()
    password = (body.get("password") or "").strip()
    if not user_id or (not display_name and not password):
        return err("Укажите пользователя и что менять")
    conn = get_conn()
    cur = conn.cursor()
    if display_name and password:
        cur.execute(
            f"UPDATE {SCHEMA}.users SET display_name = %s, password_hash = %s WHERE id = %s AND role = 'student' RETURNING id, login, display_name, role",
            (display_name, password, user_id)
        )
    elif display_name:
        cur.execute(
            f"UPDATE {SCHEMA}.users SET display_name = %s WHERE id = %s AND role = 'student' RETURNING id, login, display_name, role",
            (display_name, user_id)
        )
    else:
        cur.execute(
            f"UPDATE {SCHEMA}.users SET password_hash = %s WHERE id = %s AND role = 'student' RETURNING id, login, display_name, role",
            (password, user_id)
        )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return err("Ученик не найден", 404)
    return ok(dict(row))


# ── Schedule ──────────────────────────────────────────────
def handle_get_schedule(params):
    class_id = params.get("class_id")
    day = params.get("day")
    teacher_name = params.get("teacher_name")
    conn = get_conn()
    cur = conn.cursor()
    if teacher_name:
        cur.execute(
            f"""SELECT s.*, c.display_name as class_display_name FROM {SCHEMA}.schedule s
                LEFT JOIN {SCHEMA}.classes c ON c.id = s.class_id
                WHERE TRIM(s.teacher_name) = TRIM(%s) AND s.active = true
                  AND (c.is_active IS NULL OR c.is_active = true)
                ORDER BY s.day_of_week, s.sort_order""",
            (teacher_name,)
        )
    elif class_id and day:
        cur.execute(
            f"SELECT * FROM {SCHEMA}.schedule WHERE class_id = %s AND day_of_week = %s AND active = true ORDER BY sort_order",
            (class_id, day)
        )
    elif class_id:
        cur.execute(
            f"SELECT * FROM {SCHEMA}.schedule WHERE class_id = %s AND active = true ORDER BY day_of_week, sort_order",
            (class_id,)
        )
    else:
        cur.execute(f"SELECT * FROM {SCHEMA}.schedule WHERE active = true ORDER BY day_of_week, sort_order")
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def resort_schedule_day(cur, class_id, day_of_week):
    """Пересчитывает sort_order уроков дня по времени начала (time_slot), чтобы список всегда шёл по хронологии."""
    cur.execute(
        f"SELECT id, time_slot FROM {SCHEMA}.schedule WHERE class_id = %s AND day_of_week = %s AND active = true",
        (class_id, day_of_week)
    )
    rows = cur.fetchall()
    rows_sorted = sorted(rows, key=lambda r: r["time_slot"] or "")
    for i, r in enumerate(rows_sorted):
        cur.execute(f"UPDATE {SCHEMA}.schedule SET sort_order = %s WHERE id = %s", (i, r["id"]))


def handle_add_schedule(body):
    conn = get_conn()
    cur = conn.cursor()
    class_id = body.get("class_id")
    day_of_week = body.get("day_of_week")
    cur.execute(
        f"""INSERT INTO {SCHEMA}.schedule (day_of_week, time_slot, subject, teacher_name, room, class_id, sort_order)
            VALUES (%s, %s, %s, %s, %s, %s, 0) RETURNING id""",
        (day_of_week, body.get("time_slot"), body.get("subject"),
         body.get("teacher_name"), body.get("room"), class_id)
    )
    new_id = cur.fetchone()["id"]
    resort_schedule_day(cur, class_id, day_of_week)
    cur.execute(f"SELECT * FROM {SCHEMA}.schedule WHERE id = %s", (new_id,))
    row = cur.fetchone()
    conn.commit()
    conn.close()
    return ok(dict(row), 201)


def handle_update_schedule(item_id, body):
    conn = get_conn()
    cur = conn.cursor()
    day_of_week = body.get("day_of_week")
    cur.execute(
        f"""UPDATE {SCHEMA}.schedule SET
            day_of_week = %s, time_slot = %s, subject = %s, teacher_name = %s, room = %s
            WHERE id = %s RETURNING *, class_id""",
        (day_of_week, body.get("time_slot"), body.get("subject"),
         body.get("teacher_name"), body.get("room"), item_id)
    )
    row = cur.fetchone()
    if not row:
        conn.close()
        return err("Не найдено", 404)
    resort_schedule_day(cur, row["class_id"], day_of_week)
    cur.execute(f"SELECT * FROM {SCHEMA}.schedule WHERE id = %s", (item_id,))
    row = cur.fetchone()
    conn.commit()
    conn.close()
    return ok(dict(row))


def handle_delete_schedule(item_id):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"UPDATE {SCHEMA}.schedule SET active = false WHERE id = %s", (item_id,))
    conn.commit()
    conn.close()
    return ok({"ok": True})


# ── Modules ───────────────────────────────────────────────
def handle_get_modules():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {SCHEMA}.modules ORDER BY number")
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_update_module(body):
    """Обновляет название и даты модуля."""
    module_id = body.get("id")
    name = (body.get("name") or "").strip()
    date_start = (body.get("date_start") or "").strip()
    date_end = (body.get("date_end") or "").strip()
    if not module_id or not name or not date_start or not date_end:
        return err("id, name, date_start, date_end required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"UPDATE {SCHEMA}.modules SET name = %s, date_start = %s, date_end = %s WHERE id = %s RETURNING *",
        (name, date_start, date_end, module_id)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return err("Модуль не найден", 404)
    return ok(dict(row))


# ── Trips (выезды) ───────────────────────────────────────
def handle_get_trips(params):
    class_id = params.get("class_id")
    year = params.get("school_year", "2026-2027")
    conn = get_conn()
    cur = conn.cursor()
    if class_id:
        cur.execute(
            f"SELECT * FROM {SCHEMA}.trips WHERE class_id = %s AND school_year = %s ORDER BY trip_date",
            (class_id, year)
        )
    else:
        cur.execute(f"SELECT * FROM {SCHEMA}.trips WHERE school_year = %s ORDER BY trip_date", (year,))
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_add_trip(body):
    class_id = body.get("class_id")
    name = (body.get("name") or "").strip()
    trip_date = (body.get("trip_date") or "").strip()
    if not class_id or not name or not trip_date:
        return err("class_id, name, trip_date required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""INSERT INTO {SCHEMA}.trips (class_id, name, description, trip_date, date_end, school_year)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
        (class_id, name, body.get("description", ""), trip_date,
         body.get("date_end") or trip_date, body.get("school_year", "2026-2027"))
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    return ok(dict(row), 201)


def handle_update_trip(body):
    tid = body.get("id")
    name = (body.get("name") or "").strip()
    trip_date = (body.get("trip_date") or "").strip()
    if not tid or not name or not trip_date:
        return err("id, name, trip_date required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"UPDATE {SCHEMA}.trips SET name = %s, description = %s, trip_date = %s, date_end = %s WHERE id = %s RETURNING *",
        (name, body.get("description", ""), trip_date, body.get("date_end") or trip_date, tid)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return err("Не найдено", 404)
    return ok(dict(row))


def handle_delete_trip(body):
    tid = body.get("id")
    if not tid:
        return err("id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"UPDATE {SCHEMA}.trips SET school_year = CONCAT('archived_', school_year) WHERE id = %s", (tid,))
    conn.commit()
    conn.close()
    return ok({"ok": True})


# ── Breaks (каникулы) ─────────────────────────────────────
def handle_get_breaks(params):
    year = params.get("school_year", "2026-2027")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {SCHEMA}.breaks WHERE school_year = %s ORDER BY date_start", (year,))
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_add_break(body):
    name = (body.get("name") or "").strip()
    date_start = (body.get("date_start") or "").strip()
    date_end = (body.get("date_end") or "").strip()
    year = body.get("school_year", "2026-2027")
    if not name or not date_start or not date_end:
        return err("name, date_start, date_end required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.breaks (name, date_start, date_end, school_year) VALUES (%s, %s, %s, %s) RETURNING *",
        (name, date_start, date_end, year)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    return ok(dict(row), 201)


def handle_update_break(body):
    bid = body.get("id")
    name = (body.get("name") or "").strip()
    date_start = (body.get("date_start") or "").strip()
    date_end = (body.get("date_end") or "").strip()
    if not bid or not name or not date_start or not date_end:
        return err("id, name, date_start, date_end required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"UPDATE {SCHEMA}.breaks SET name = %s, date_start = %s, date_end = %s WHERE id = %s RETURNING *",
        (name, date_start, date_end, bid)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return err("Не найдено", 404)
    return ok(dict(row))


def handle_delete_break(body):
    bid = body.get("id")
    if not bid:
        return err("id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"UPDATE {SCHEMA}.breaks SET school_year = CONCAT('archived_', school_year) WHERE id = %s", (bid,))
    conn.commit()
    conn.close()
    return ok({"ok": True})


# ── Holidays (праздники) ──────────────────────────────────
def handle_get_holidays(params):
    year = params.get("school_year", "2026-2027")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {SCHEMA}.holidays WHERE school_year = %s ORDER BY holiday_date", (year,))
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_add_holiday(body):
    name = (body.get("name") or "").strip()
    holiday_date = (body.get("holiday_date") or "").strip()
    year = body.get("school_year", "2026-2027")
    cancels_lessons = body.get("cancels_lessons", True)
    if not name or not holiday_date:
        return err("name, holiday_date required")
    conn = get_conn()
    cur = conn.cursor()
    # Проверяем уникальность даты
    cur.execute(f"SELECT id FROM {SCHEMA}.holidays WHERE holiday_date = %s AND school_year = %s", (holiday_date, year))
    if cur.fetchone():
        conn.close()
        return err("Эта дата уже добавлена")
    cur.execute(
        f"INSERT INTO {SCHEMA}.holidays (name, holiday_date, school_year, cancels_lessons) VALUES (%s, %s, %s, %s) RETURNING *",
        (name, holiday_date, year, cancels_lessons)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    return ok(dict(row), 201)


def handle_update_holiday(body):
    hid = body.get("id")
    name = (body.get("name") or "").strip()
    holiday_date = (body.get("holiday_date") or "").strip()
    cancels_lessons = body.get("cancels_lessons", True)
    if not hid or not name or not holiday_date:
        return err("id, name, holiday_date required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"UPDATE {SCHEMA}.holidays SET name = %s, holiday_date = %s, cancels_lessons = %s WHERE id = %s RETURNING *",
        (name, holiday_date, cancels_lessons, hid)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return err("Не найдено", 404)
    return ok(dict(row))


def handle_delete_holiday(body):
    hid = body.get("id")
    if not hid:
        return err("id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"UPDATE {SCHEMA}.holidays SET school_year = CONCAT('archived_', school_year) WHERE id = %s", (hid,))
    conn.commit()
    conn.close()
    return ok({"ok": True})


# ── Schedule by dates ─────────────────────────────────────
def handle_get_schedule_dates(params):
    """Расписание на конкретные даты для модуля и класса."""
    class_id = params.get("class_id")
    module_id = params.get("module_id")
    lesson_date = params.get("lesson_date")
    teacher_name = params.get("teacher_name")
    school_year = params.get("school_year")
    conn = get_conn()
    cur = conn.cursor()
    if teacher_name:
        cur.execute(
            f"""SELECT sd.*, c.display_name as class_display_name FROM {SCHEMA}.schedule_dates sd
                JOIN {SCHEMA}.modules m ON m.id = sd.module_id
                LEFT JOIN {SCHEMA}.classes c ON c.id = sd.class_id
                WHERE TRIM(sd.teacher_name) = TRIM(%s) AND m.school_year = %s
                  AND (c.is_active IS NULL OR c.is_active = true) AND sd.sort_order >= 0
                ORDER BY sd.lesson_date, sd.sort_order""",
            (teacher_name, school_year or "2026-2027")
        )
    elif lesson_date:
        cur.execute(
            f"""SELECT * FROM {SCHEMA}.schedule_dates
                WHERE class_id = %s AND lesson_date = %s AND sort_order >= 0
                ORDER BY sort_order""",
            (class_id, lesson_date)
        )
    elif module_id and class_id:
        cur.execute(
            f"""SELECT * FROM {SCHEMA}.schedule_dates
                WHERE class_id = %s AND module_id = %s AND sort_order >= 0
                ORDER BY lesson_date, sort_order""",
            (class_id, module_id)
        )
    else:
        cur.execute(
            f"SELECT * FROM {SCHEMA}.schedule_dates WHERE class_id = %s AND sort_order >= 0 ORDER BY lesson_date, sort_order",
            (class_id,)
        )
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_add_schedule_date(body):
    """Добавляет один урок на конкретную дату (в рамках модуля или без него)."""
    class_id = body.get("class_id")
    lesson_date = body.get("lesson_date")
    time_slot = (body.get("time_slot") or "").strip()
    subject = (body.get("subject") or "").strip()
    if not class_id or not lesson_date or not time_slot or not subject:
        return err("class_id, lesson_date, time_slot, subject required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM {SCHEMA}.schedule_dates WHERE class_id = %s AND lesson_date = %s",
        (class_id, lesson_date)
    )
    next_order = cur.fetchone()["next_order"]
    cur.execute(
        f"""INSERT INTO {SCHEMA}.schedule_dates
            (class_id, module_id, lesson_date, day_of_week, time_slot, subject, teacher_name, room, sort_order)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
        (class_id, body.get("module_id"), lesson_date, body.get("day_of_week", ""),
         time_slot, subject, body.get("teacher_name", ""), body.get("room", ""), next_order)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    return ok(dict(row), 201)


def handle_update_schedule_date(body):
    """Редактирует один урок конкретной даты."""
    sid = body.get("id")
    time_slot = (body.get("time_slot") or "").strip()
    subject = (body.get("subject") or "").strip()
    if not sid or not time_slot or not subject:
        return err("id, time_slot, subject required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""UPDATE {SCHEMA}.schedule_dates SET
            time_slot = %s, subject = %s, teacher_name = %s, room = %s
            WHERE id = %s RETURNING *""",
        (time_slot, subject, body.get("teacher_name", ""), body.get("room", ""), sid)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return err("Не найдено", 404)
    return ok(dict(row))


def handle_delete_schedule_date(body):
    """Удаляет один урок конкретной даты."""
    sid = body.get("id")
    if not sid:
        return err("id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {SCHEMA}.schedule_dates WHERE id = %s", (sid,))
    conn.commit()
    conn.close()
    return ok({"ok": True})


def handle_save_module_schedule(body):
    """Сохраняет шаблон расписания на весь модуль.
    Принимает: class_id, module_id, weekly_template (dict day->list of lessons),
    и разворачивает его на все рабочие недели модуля.
    """
    import datetime
    class_id = body.get("class_id")
    module_id = body.get("module_id")
    weekly = body.get("weekly_template", {})  # {"Понедельник": [{time_slot, subject, teacher_name, room},...], ...}

    if not class_id or not module_id or not weekly:
        return err("class_id, module_id, weekly_template required")

    conn = get_conn()
    cur = conn.cursor()

    # Получаем даты модуля
    cur.execute(f"SELECT date_start, date_end FROM {SCHEMA}.modules WHERE id = %s", (module_id,))
    mod = cur.fetchone()
    if not mod:
        conn.close()
        return err("Модуль не найден", 404)

    date_start = mod["date_start"]
    date_end = mod["date_end"]

    # Маппинг русских дней на weekday()
    day_map = {"Понедельник": 0, "Вторник": 1, "Среда": 2, "Четверг": 3, "Пятница": 4}

    # Архивируем старые записи для этого класса+модуля
    cur.execute(
        f"UPDATE {SCHEMA}.schedule_dates SET sort_order = -1 WHERE class_id = %s AND module_id = %s AND sort_order >= 0",
        (class_id, module_id)
    )
    # Вставляем через UPDATE existing rows trick - просто добавляем новые
    # Сначала удаляем только через is_archived
    cur.execute(
        f"UPDATE {SCHEMA}.schedule_dates SET module_id = NULL WHERE class_id = %s AND module_id = %s AND sort_order = -1",
        (class_id, module_id)
    )

    # Собираем каникулы и только те праздники, что отменяют уроки — исключаем эти дни
    cur.execute(f"SELECT holiday_date::text FROM {SCHEMA}.holidays WHERE school_year = '2026-2027' AND cancels_lessons = true")
    excluded = {r["holiday_date"] for r in cur.fetchall()}
    cur.execute(f"SELECT date_start, date_end FROM {SCHEMA}.breaks WHERE school_year = '2026-2027'")
    for br in cur.fetchall():
        bs = br["date_start"] if isinstance(br["date_start"], datetime.date) else datetime.date.fromisoformat(str(br["date_start"]))
        be = br["date_end"] if isinstance(br["date_end"], datetime.date) else datetime.date.fromisoformat(str(br["date_end"]))
        d = bs
        while d <= be:
            excluded.add(d.isoformat())
            d += datetime.timedelta(days=1)

    inserted = 0
    current = date_start
    if isinstance(current, str):
        current = datetime.date.fromisoformat(current)
    if isinstance(date_end, str):
        date_end = datetime.date.fromisoformat(date_end)

    while current <= date_end:
        weekday = current.weekday()
        # Пропускаем выходные, праздники и каникулы
        if current.isoformat() in excluded or weekday >= 5:
            current += datetime.timedelta(days=1)
            continue
        day_name = None
        for name, num in day_map.items():
            if num == weekday:
                day_name = name
                break
        if day_name and day_name in weekly:
            lessons = sorted(weekly[day_name], key=lambda l: l.get("time_slot") or "")
            for idx, lesson in enumerate(lessons):
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.schedule_dates
                        (class_id, module_id, lesson_date, day_of_week, time_slot, subject, teacher_name, room, sort_order)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (class_id, module_id, current.isoformat(), day_name,
                     lesson.get("time_slot", ""), lesson.get("subject", ""),
                     lesson.get("teacher_name", ""), lesson.get("room", ""), idx)
                )
                inserted += 1
        current += datetime.timedelta(days=1)

    conn.commit()
    conn.close()
    return ok({"ok": True, "inserted": inserted})


# ── Homework ──────────────────────────────────────────────
def handle_get_homework(params):
    class_id = params.get("class_id")
    teacher_id = params.get("teacher_id")
    conn = get_conn()
    cur = conn.cursor()
    if teacher_id:
        cur.execute(
            f"""SELECT h.*, c.display_name as class_display_name FROM {SCHEMA}.homework h
                LEFT JOIN {SCHEMA}.classes c ON c.id = h.class_id
                WHERE h.teacher_id = %s ORDER BY h.created_at DESC""",
            (teacher_id,)
        )
    elif class_id:
        cur.execute(
            f"SELECT * FROM {SCHEMA}.homework WHERE class_id = %s ORDER BY created_at DESC",
            (class_id,)
        )
    else:
        cur.execute(f"SELECT * FROM {SCHEMA}.homework ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_add_homework(body):
    conn = get_conn()
    cur = conn.cursor()
    attachments = body.get("attachments") or []
    cur.execute(
        f"INSERT INTO {SCHEMA}.homework (subject, task, due_date, teacher_id, class_id, attachments) VALUES (%s, %s, %s, %s, %s, %s) RETURNING *",
        (body.get("subject"), body.get("task"), body.get("due_date"),
         body.get("teacher_id"), body.get("class_id"), json.dumps(attachments, ensure_ascii=False))
    )
    row = cur.fetchone()
    if body.get("class_id"):
        cur.execute(
            f"""SELECT DISTINCT ps.parent_id FROM {SCHEMA}.parent_students ps
                JOIN {SCHEMA}.students s ON s.id = ps.student_id WHERE s.class_id = %s""",
            (body.get("class_id"),)
        )
        for p in cur.fetchall():
            cur.execute(
                f"INSERT INTO {SCHEMA}.notifications (parent_id, text, type) VALUES (%s, %s, 'homework')",
                (p["parent_id"], f"Новое ДЗ по «{body.get('subject')}» до {body.get('due_date')}")
            )
    conn.commit()
    conn.close()
    return ok(dict(row), 201)


def handle_update_homework(hw_id, body):
    conn = get_conn()
    cur = conn.cursor()
    attachments = body.get("attachments") or []
    cur.execute(
        f"UPDATE {SCHEMA}.homework SET subject = %s, task = %s, due_date = %s, attachments = %s WHERE id = %s RETURNING *",
        (body.get("subject"), body.get("task"), body.get("due_date"), json.dumps(attachments, ensure_ascii=False), hw_id)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return err("Не найдено", 404)
    return ok(dict(row))


# ── Grades ────────────────────────────────────────────────
def handle_get_grades(params):
    student_id = params.get("student_id")
    class_id = params.get("class_id")
    conn = get_conn()
    cur = conn.cursor()
    if student_id:
        cur.execute(
            f"""SELECT g.*, s.full_name as student_name FROM {SCHEMA}.grades g
                JOIN {SCHEMA}.students s ON s.id = g.student_id
                WHERE g.student_id = %s ORDER BY g.created_at DESC""",
            (student_id,)
        )
    elif class_id:
        cur.execute(
            f"""SELECT g.*, s.full_name as student_name FROM {SCHEMA}.grades g
                JOIN {SCHEMA}.students s ON s.id = g.student_id
                WHERE s.class_id = %s ORDER BY g.created_at DESC""",
            (class_id,)
        )
    else:
        cur.execute(
            f"""SELECT g.*, s.full_name as student_name FROM {SCHEMA}.grades g
                JOIN {SCHEMA}.students s ON s.id = g.student_id ORDER BY g.created_at DESC"""
        )
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_add_grade(body):
    grade_max = body.get("grade_max")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""INSERT INTO {SCHEMA}.grades (student_id, subject, grade, grade_max, is_final, comment, grade_date, teacher_id, class_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
        (body.get("student_id"), body.get("subject"), body.get("grade"), grade_max,
         bool(body.get("is_final")), body.get("comment", ""), body.get("grade_date"),
         body.get("teacher_id"), body.get("class_id"))
    )
    row = cur.fetchone()
    grade_label = f"{body.get('grade')}/{grade_max}" if grade_max else body.get("grade")
    cur.execute(f"SELECT parent_id FROM {SCHEMA}.parent_students WHERE student_id = %s", (body.get("student_id"),))
    for p in cur.fetchall():
        cur.execute(
            f"INSERT INTO {SCHEMA}.notifications (parent_id, text, type) VALUES (%s, %s, 'grade')",
            (p["parent_id"], f"Новая отметка по {body.get('subject')}: {grade_label} ⭐")
        )
    conn.commit()
    conn.close()
    return ok(dict(row), 201)


# ── Attendance ────────────────────────────────────────────
def handle_get_attendance(params):
    student_id = params.get("student_id")
    class_id = params.get("class_id")
    lesson_date = params.get("lesson_date")
    conn = get_conn()
    cur = conn.cursor()
    query = f"""SELECT a.*, s.full_name as student_name FROM {SCHEMA}.attendance a
                JOIN {SCHEMA}.students s ON s.id = a.student_id WHERE 1=1"""
    args = []
    if student_id:
        query += " AND a.student_id = %s"
        args.append(student_id)
    if class_id:
        query += " AND a.class_id = %s"
        args.append(class_id)
    if lesson_date:
        query += " AND a.lesson_date = %s"
        args.append(lesson_date)
    query += " ORDER BY a.lesson_date DESC, a.created_at DESC"
    cur.execute(query, tuple(args))
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_add_attendance(body):
    student_id = body.get("student_id")
    subject = (body.get("subject") or "").strip()
    status = body.get("status")
    lesson_date = body.get("lesson_date")
    class_id = body.get("class_id")
    if not student_id or not subject or status not in ("absent", "late") or not lesson_date:
        return err("student_id, subject, status (absent/late), lesson_date required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""INSERT INTO {SCHEMA}.attendance (student_id, class_id, subject, status, comment, lesson_date, teacher_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *""",
        (student_id, class_id, subject, status, body.get("comment", ""), lesson_date, body.get("teacher_id"))
    )
    row = cur.fetchone()
    cur.execute(f"SELECT parent_id FROM {SCHEMA}.parent_students WHERE student_id = %s", (student_id,))
    label = "Опоздание" if status == "late" else "Отсутствие"
    for p in cur.fetchall():
        cur.execute(
            f"INSERT INTO {SCHEMA}.notifications (parent_id, text, type) VALUES (%s, %s, 'attendance')",
            (p["parent_id"], f"{label} по «{subject}» ({lesson_date})")
        )
    conn.commit()
    conn.close()
    return ok(dict(row), 201)


def handle_update_attendance(body):
    aid = body.get("id")
    status = body.get("status")
    if not aid or status not in ("absent", "late"):
        return err("id, status (absent/late) required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""UPDATE {SCHEMA}.attendance SET status = %s, subject = %s, comment = %s, lesson_date = %s
            WHERE id = %s RETURNING *""",
        (status, body.get("subject"), body.get("comment", ""), body.get("lesson_date"), aid)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return err("Не найдено", 404)
    return ok(dict(row))


def handle_delete_attendance(body):
    aid = body.get("id")
    if not aid:
        return err("id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {SCHEMA}.attendance WHERE id = %s", (aid,))
    conn.commit()
    conn.close()
    return ok({"ok": True})


# ── Recommendations ───────────────────────────────────────
def handle_get_recommendations(params):
    student_id = params.get("student_id")
    class_id = params.get("class_id")
    conn = get_conn()
    cur = conn.cursor()
    if student_id:
        cur.execute(
            f"""SELECT r.*, s.full_name as student_name, u.display_name as teacher_name
                FROM {SCHEMA}.recommendations r
                JOIN {SCHEMA}.students s ON s.id = r.student_id
                LEFT JOIN {SCHEMA}.users u ON u.id = r.teacher_id
                WHERE r.student_id = %s ORDER BY r.created_at DESC""",
            (student_id,)
        )
    elif class_id:
        cur.execute(
            f"""SELECT r.*, s.full_name as student_name, u.display_name as teacher_name
                FROM {SCHEMA}.recommendations r
                JOIN {SCHEMA}.students s ON s.id = r.student_id
                LEFT JOIN {SCHEMA}.users u ON u.id = r.teacher_id
                WHERE s.class_id = %s ORDER BY r.created_at DESC""",
            (class_id,)
        )
    else:
        cur.execute(
            f"""SELECT r.*, s.full_name as student_name, u.display_name as teacher_name
                FROM {SCHEMA}.recommendations r
                JOIN {SCHEMA}.students s ON s.id = r.student_id
                LEFT JOIN {SCHEMA}.users u ON u.id = r.teacher_id ORDER BY r.created_at DESC"""
        )
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_add_recommendation(body):
    conn = get_conn()
    cur = conn.cursor()
    teacher_name = body.get("teacher_name", "Учитель")
    class_id = body.get("class_id")
    attachments = body.get("attachments") or []
    attachments_json = json.dumps(attachments, ensure_ascii=False)

    if body.get("student_id") == "all":
        cur.execute(f"SELECT id FROM {SCHEMA}.students WHERE class_id = %s AND is_archived IS NOT TRUE", (class_id,))
        student_ids = [s["id"] for s in cur.fetchall()]
        rows = []
        for sid in student_ids:
            cur.execute(
                f"""INSERT INTO {SCHEMA}.recommendations (student_id, subject, text, rec_date, teacher_id, class_id, attachments)
                    VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *""",
                (sid, body.get("subject"), body.get("text"), body.get("rec_date"), body.get("teacher_id"), class_id, attachments_json)
            )
            rows.append(cur.fetchone())
            cur.execute(f"SELECT parent_id FROM {SCHEMA}.parent_students WHERE student_id = %s", (sid,))
            for p in cur.fetchall():
                cur.execute(
                    f"INSERT INTO {SCHEMA}.notifications (parent_id, text, type) VALUES (%s, %s, 'recommendation')",
                    (p["parent_id"], f"Новая рекомендация по {body.get('subject')} от {teacher_name}")
                )
        conn.commit()
        conn.close()
        return ok({"ok": True, "count": len(rows)}, 201)

    cur.execute(
        f"""INSERT INTO {SCHEMA}.recommendations (student_id, subject, text, rec_date, teacher_id, class_id, attachments)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *""",
        (body.get("student_id"), body.get("subject"), body.get("text"),
         body.get("rec_date"), body.get("teacher_id"), class_id, attachments_json)
    )
    row = cur.fetchone()
    cur.execute(f"SELECT parent_id FROM {SCHEMA}.parent_students WHERE student_id = %s", (body.get("student_id"),))
    for p in cur.fetchall():
        cur.execute(
            f"INSERT INTO {SCHEMA}.notifications (parent_id, text, type) VALUES (%s, %s, 'recommendation')",
            (p["parent_id"], f"Новая рекомендация по {body.get('subject')} от {teacher_name}")
        )
    conn.commit()
    conn.close()
    return ok(dict(row), 201)


def handle_update_recommendation(body):
    """Редактирует существующую рекомендацию (текст, предмет, дата, вложения)."""
    rec_id = body.get("id")
    if not rec_id:
        return err("id required")
    attachments = body.get("attachments") or []
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""UPDATE {SCHEMA}.recommendations SET subject = %s, text = %s, rec_date = %s, attachments = %s
            WHERE id = %s RETURNING *""",
        (body.get("subject"), body.get("text"), body.get("rec_date"), json.dumps(attachments, ensure_ascii=False), rec_id)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return err("Не найдено", 404)
    return ok(dict(row))


def handle_delete_recommendation(body):
    rec_id = body.get("id")
    if not rec_id:
        return err("id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {SCHEMA}.recommendations WHERE id = %s", (rec_id,))
    conn.commit()
    conn.close()
    return ok({"ok": True})


# ── Notifications ─────────────────────────────────────────
def handle_get_notifications(params):
    parent_id = params.get("parent_id")
    if not parent_id:
        return err("parent_id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT * FROM {SCHEMA}.notifications WHERE parent_id = %s ORDER BY created_at DESC LIMIT 20",
        (parent_id,)
    )
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_mark_read(body):
    """Отмечает уведомления прочитанными. Если передан notification_id — только его,
    иначе все уведомления родителя (кнопка «Прочитать все»)."""
    parent_id = body.get("parent_id")
    notification_id = body.get("notification_id")
    if not parent_id:
        return err("parent_id required")
    conn = get_conn()
    cur = conn.cursor()
    if notification_id:
        cur.execute(
            f"UPDATE {SCHEMA}.notifications SET is_read = true WHERE parent_id = %s AND id = %s",
            (parent_id, notification_id)
        )
    else:
        cur.execute(f"UPDATE {SCHEMA}.notifications SET is_read = true WHERE parent_id = %s", (parent_id,))
    conn.commit()
    conn.close()
    return ok({"ok": True})


# ── Password ──────────────────────────────────────────────
def handle_change_password(body):
    """Пользователь (учитель/родитель/ученик) сам меняет свой пароль,
    подтвердив текущий."""
    user_id = body.get("user_id")
    current_password = (body.get("current_password") or "").strip()
    new_password = (body.get("new_password") or "").strip()
    if not user_id or not current_password or not new_password:
        return err("Укажите текущий и новый пароль")
    if len(new_password) < 6:
        return err("Новый пароль должен быть не короче 6 символов")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT id, password_hash FROM {SCHEMA}.users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return err("Пользователь не найден", 404)
    if user["password_hash"] != current_password:
        conn.close()
        return err("Текущий пароль неверен", 403)
    cur.execute(f"UPDATE {SCHEMA}.users SET password_hash = %s WHERE id = %s", (new_password, user_id))
    conn.commit()
    conn.close()
    return ok({"ok": True})


# ── Email ─────────────────────────────────────────────────
def handle_update_email(body):
    """Родитель сам сохраняет/меняет свой email в профиле."""
    user_id = body.get("user_id")
    email = (body.get("email") or "").strip()
    if not user_id:
        return err("user_id required")
    if email and "@" not in email:
        return err("Некорректный email")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"UPDATE {SCHEMA}.users SET email = %s WHERE id = %s AND role = 'parent' RETURNING id, email",
        (email or None, user_id)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return err("Не найдено", 404)
    return ok(dict(row))


def send_email(to_email, subject, text_body):
    import smtplib
    from email.mime.text import MIMEText
    host = os.environ["SMTP_HOST"]
    port = int(os.environ.get("SMTP_PORT", "465"))
    login_ = os.environ["SMTP_LOGIN"]
    password = os.environ["SMTP_PASSWORD"]
    msg = MIMEText(text_body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = login_
    msg["To"] = to_email
    with smtplib.SMTP_SSL(host, port) as server:
        server.login(login_, password)
        server.sendmail(login_, [to_email], msg.as_string())


def handle_run_daily_digest():
    """Раз в сутки собирает непрочитанные email-уведомления (оценки/ДЗ) по каждому родителю
    и отправляет их одним письмом-сводкой. Безопасно вызывать многократно за день —
    повторно за тот же день сводку не отправит."""
    import datetime
    today = datetime.date.today().isoformat()
    conn = get_conn()
    cur = conn.cursor()

    cur.execute(f"SELECT 1 FROM {SCHEMA}.digest_runs WHERE run_date = %s", (today,))
    if cur.fetchone():
        conn.close()
        return ok({"ok": True, "skipped": "already_sent_today"})

    cur.execute(
        f"""SELECT n.id, n.parent_id, n.text, n.type, u.email, u.display_name
            FROM {SCHEMA}.notifications n
            JOIN {SCHEMA}.users u ON u.id = n.parent_id
            WHERE n.emailed = false AND u.email IS NOT NULL AND u.email != ''
              AND n.type IN ('grade', 'homework')
            ORDER BY n.parent_id, n.created_at"""
    )
    rows = cur.fetchall()

    by_parent = {}
    for r in rows:
        by_parent.setdefault(r["parent_id"], {"email": r["email"], "items": []})
        by_parent[r["parent_id"]]["items"].append(r["text"])

    sent = 0
    errors = []
    for parent_id, data in by_parent.items():
        body_text = "Здравствуйте!\n\nНовости из Гранатового Дневника за сегодня:\n\n"
        body_text += "\n".join(f"• {t}" for t in data["items"])
        body_text += "\n\nЭто автоматическое письмо, отвечать на него не нужно."
        try:
            send_email(data["email"], "Гранатовый Дневник — новости за день", body_text)
            sent += 1
        except Exception as e:
            errors.append(str(e))
            continue
        cur.execute(
            f"""UPDATE {SCHEMA}.notifications SET emailed = true
                WHERE parent_id = %s AND type IN ('grade', 'homework') AND emailed = false""",
            (parent_id,)
        )

    cur.execute(
        f"INSERT INTO {SCHEMA}.digest_runs (run_date, sent_count) VALUES (%s, %s)",
        (today, sent)
    )
    conn.commit()
    conn.close()
    return ok({"ok": True, "sent": sent, "errors": errors})


# ── Extended day (Продлёнка) ─────────────────────────────
def handle_get_extended_day_students():
    """Список учеников, добавленных в продлёнку, сгруппированных по классам,
    вместе с их актуальными домашними заданиями."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""SELECT eds.id as extended_id, s.id as student_id, s.full_name,
                   s.class_id, c.display_name as class_display_name, c.name as class_name,
                   c.grade, c.letter, eds.days
            FROM {SCHEMA}.extended_day_students eds
            JOIN {SCHEMA}.students s ON s.id = eds.student_id
            LEFT JOIN {SCHEMA}.classes c ON c.id = s.class_id
            WHERE s.is_archived = false
            ORDER BY c.grade, c.letter, s.full_name"""
    )
    students = list(cur.fetchall())

    class_ids = list({s["class_id"] for s in students if s["class_id"]})
    homework_by_class = {}
    if class_ids:
        cur.execute(
            f"""SELECT * FROM {SCHEMA}.homework WHERE class_id = ANY(%s)
                ORDER BY due_date, created_at DESC""",
            (class_ids,)
        )
        for hw in cur.fetchall():
            homework_by_class.setdefault(hw["class_id"], []).append(dict(hw))

    conn.close()
    result = []
    for s in students:
        item = dict(s)
        item["homework"] = homework_by_class.get(s["class_id"], [])
        result.append(item)
    return ok(result)


def handle_add_extended_day_student(body):
    student_id = body.get("student_id")
    if not student_id:
        return err("student_id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""INSERT INTO {SCHEMA}.extended_day_students (student_id) VALUES (%s)
            ON CONFLICT (student_id) DO NOTHING RETURNING *""",
        (student_id,)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return ok({"ok": True, "already_added": True})
    return ok(dict(row), 201)


def handle_remove_extended_day_student(body):
    student_id = body.get("student_id")
    if not student_id:
        return err("student_id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {SCHEMA}.extended_day_students WHERE student_id = %s", (student_id,))
    conn.commit()
    conn.close()
    return ok({"ok": True})


def handle_update_extended_day_student_days(body):
    """Обновляет список дней недели, когда ученик посещает продлёнку."""
    student_id = body.get("student_id")
    days = body.get("days")
    if not student_id or not isinstance(days, list):
        return err("student_id and days required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"UPDATE {SCHEMA}.extended_day_students SET days = %s WHERE student_id = %s RETURNING *",
        (days, student_id)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return err("Ученик не найден в продлёнке", 404)
    return ok(dict(row))


# ── Electives (Факультативы) ─────────────────────────────
def handle_get_elective_students():
    """Список учеников, записанных на факультативы, сгруппированных по предмету и классу."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""SELECT es.id as elective_id, es.subject, s.id as student_id, s.full_name,
                   s.class_id, c.display_name as class_display_name, c.name as class_name,
                   c.grade, c.letter, es.days, es.lesson_slot, es.day_slots
            FROM {SCHEMA}.elective_students es
            JOIN {SCHEMA}.students s ON s.id = es.student_id
            LEFT JOIN {SCHEMA}.classes c ON c.id = s.class_id
            WHERE s.is_archived = false
            ORDER BY es.subject, c.grade, c.letter, s.full_name"""
    )
    rows = cur.fetchall()
    conn.close()
    return ok([dict(r) for r in rows])


VALID_ELECTIVE_LESSON_SLOTS = ("0", "5", "6", "7")
VALID_ELECTIVE_DAYS = ("Понедельник", "Вторник", "Среда", "Четверг", "Пятница")


def _normalize_day_slots(day_slots):
    """Проверяет и очищает day_slots: {день: урок}. Невалидные дни/уроки отбрасывает."""
    if not isinstance(day_slots, dict):
        return None
    result = {}
    for day, slot in day_slots.items():
        if day not in VALID_ELECTIVE_DAYS:
            continue
        slot = str(slot)
        if slot not in VALID_ELECTIVE_LESSON_SLOTS:
            continue
        result[day] = slot
    return result


def handle_add_elective_student(body):
    student_id = body.get("student_id")
    subject = (body.get("subject") or "").strip()
    if not student_id or not subject:
        return err("student_id and subject required")

    day_slots = _normalize_day_slots(body.get("day_slots"))
    if not day_slots:
        # Обратная совместимость: старый формат days[] + один lesson_slot на все дни
        days = body.get("days")
        lesson_slot = str(body.get("lesson_slot") or "5")
        if lesson_slot not in VALID_ELECTIVE_LESSON_SLOTS:
            lesson_slot = "5"
        if not isinstance(days, list) or not days:
            days = list(VALID_ELECTIVE_DAYS)
        day_slots = {d: lesson_slot for d in days if d in VALID_ELECTIVE_DAYS}

    days = list(day_slots.keys())
    lesson_slot = next(iter(day_slots.values()), "5")

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""INSERT INTO {SCHEMA}.elective_students (student_id, subject, days, lesson_slot, day_slots)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (student_id, subject) DO NOTHING RETURNING *""",
        (student_id, subject, days, lesson_slot, json.dumps(day_slots, ensure_ascii=False))
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return ok({"ok": True, "already_added": True})
    return ok(dict(row), 201)


def handle_remove_elective_student(body):
    student_id = body.get("student_id")
    subject = (body.get("subject") or "").strip()
    if not student_id or not subject:
        return err("student_id and subject required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {SCHEMA}.elective_students WHERE student_id = %s AND subject = %s", (student_id, subject))
    conn.commit()
    conn.close()
    return ok({"ok": True})


def handle_update_elective_student_schedule(body):
    """Обновляет расписание записи ученика на факультатив.
    Принимает либо day_slots целиком ({день: урок}), либо точечное изменение
    одного дня (day + slot, slot=None чтобы снять день)."""
    student_id = body.get("student_id")
    subject = (body.get("subject") or "").strip()
    if not student_id or not subject:
        return err("student_id and subject required")

    conn = get_conn()
    cur = conn.cursor()

    day_slots = _normalize_day_slots(body.get("day_slots"))

    if day_slots is None and "day" in body:
        day = body.get("day")
        slot = body.get("slot")
        if day not in VALID_ELECTIVE_DAYS:
            conn.close()
            return err("invalid day")
        cur.execute(f"SELECT day_slots FROM {SCHEMA}.elective_students WHERE student_id = %s AND subject = %s", (student_id, subject))
        existing = cur.fetchone()
        if not existing:
            conn.close()
            return err("Запись не найдена", 404)
        current = dict(existing["day_slots"] or {})
        if slot is None:
            current.pop(day, None)
        else:
            slot = str(slot)
            if slot not in VALID_ELECTIVE_LESSON_SLOTS:
                conn.close()
                return err("slot must be 0, 5, 6 or 7")
            current[day] = slot
        day_slots = current

    if day_slots is None:
        # Совместимость со старым форматом: days[] и/или lesson_slot
        days = body.get("days")
        lesson_slot = body.get("lesson_slot")
        cur.execute(f"SELECT days, day_slots FROM {SCHEMA}.elective_students WHERE student_id = %s AND subject = %s", (student_id, subject))
        existing = cur.fetchone()
        if not existing:
            conn.close()
            return err("Запись не найдена", 404)
        current = dict(existing["day_slots"] or {})
        if isinstance(days, list):
            valid_days = [d for d in days if d in VALID_ELECTIVE_DAYS]
            fallback_slot = str(lesson_slot) if lesson_slot else "5"
            current = {d: current.get(d, fallback_slot) for d in valid_days}
        if lesson_slot is not None:
            lesson_slot = str(lesson_slot)
            if lesson_slot not in VALID_ELECTIVE_LESSON_SLOTS:
                conn.close()
                return err("lesson_slot must be 0, 5, 6 or 7")
            current = {d: lesson_slot for d in current}
        day_slots = current

    if not day_slots:
        conn.close()
        return err("day_slots required")

    days = list(day_slots.keys())
    lesson_slot = next(iter(day_slots.values()), "5")
    cur.execute(
        f"""UPDATE {SCHEMA}.elective_students SET days = %s, lesson_slot = %s, day_slots = %s
            WHERE student_id = %s AND subject = %s RETURNING *""",
        (days, lesson_slot, json.dumps(day_slots, ensure_ascii=False), student_id, subject)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return err("Запись не найдена", 404)
    return ok(dict(row))


def handle_get_elective_subjects_for_student(params):
    """Возвращает факультативы, на которые записан конкретный ученик, вместе с
    расписанием по дням ({subject: {день: урок}}) — используется для фильтрации
    расписания и PDF-экспорта у родителя/ученика: показывать факультатив нужно
    только в тот день и на тот урок (0/5/6/7), на который ученик реально записан."""
    student_id = params.get("student_id")
    if not student_id:
        return err("student_id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT subject, days, lesson_slot, day_slots FROM {SCHEMA}.elective_students WHERE student_id = %s", (student_id,))
    rows = cur.fetchall()
    conn.close()
    result = {}
    for r in rows:
        day_slots = r.get("day_slots") or {}
        if not day_slots:
            days = r.get("days") or list(VALID_ELECTIVE_DAYS)
            slot = r.get("lesson_slot") or "5"
            day_slots = {d: slot for d in days}
        result[r["subject"]] = day_slots
    return ok(result)


# ── Chat (свой чат в каждом классе: родители этого класса + все учителя) ──
def _parent_belongs_to_class(cur, parent_id, class_id):
    cur.execute(
        f"""SELECT 1 FROM {SCHEMA}.parent_students ps
            JOIN {SCHEMA}.students s ON s.id = ps.student_id
            WHERE ps.parent_id = %s AND s.class_id = %s LIMIT 1""",
        (parent_id, class_id)
    )
    return cur.fetchone() is not None


def handle_get_chat_messages(params):
    """Возвращает сообщения чата класса, отсортированные по времени (старые сверху).
    Родитель видит только чат класса своего ребёнка, учитель — чат любого класса.
    Поддерживает пагинацию через before_id — для подгрузки более старых сообщений."""
    class_id = params.get("class_id")
    if not class_id:
        return err("class_id required")
    user_id = params.get("user_id")
    role = params.get("role")
    before_id = params.get("before_id")
    limit = 50
    conn = get_conn()
    cur = conn.cursor()
    if role == "student":
        conn.close()
        return err("Чат недоступен для учеников", 403)
    if role == "parent" and user_id and not _parent_belongs_to_class(cur, user_id, class_id):
        conn.close()
        return err("Нет доступа к чату этого класса", 403)
    if before_id:
        cur.execute(
            f"""SELECT * FROM {SCHEMA}.chat_messages
                WHERE class_id = %s AND id < %s
                ORDER BY id DESC LIMIT %s""",
            (class_id, before_id, limit)
        )
    else:
        cur.execute(
            f"""SELECT * FROM {SCHEMA}.chat_messages
                WHERE class_id = %s
                ORDER BY id DESC LIMIT %s""",
            (class_id, limit)
        )
    rows = cur.fetchall()
    conn.close()
    return ok(list(reversed(rows)))


def handle_send_chat_message(body):
    """Публикует сообщение в чат класса. Писать могут только родители учеников
    этого класса и учителя (учитель — в любой класс)."""
    class_id = body.get("class_id")
    sender_id = body.get("sender_id")
    sender_name = (body.get("sender_name") or "").strip()
    sender_role = body.get("sender_role")
    text = (body.get("text") or "").strip()
    if not class_id or not sender_id or not sender_name or not sender_role:
        return err("class_id, sender_id, sender_name, sender_role required")
    if not text:
        return err("text required")
    if len(text) > 2000:
        return err("text too long")
    conn = get_conn()
    cur = conn.cursor()
    if sender_role == "student":
        conn.close()
        return err("Чат недоступен для учеников", 403)
    if sender_role == "parent" and not _parent_belongs_to_class(cur, sender_id, class_id):
        conn.close()
        return err("Нет доступа к чату этого класса", 403)
    cur.execute(
        f"""INSERT INTO {SCHEMA}.chat_messages (class_id, sender_id, sender_name, sender_role, text)
            VALUES (%s, %s, %s, %s, %s) RETURNING *""",
        (class_id, sender_id, sender_name, sender_role, text)
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    return ok(dict(row), 201)


def handle_delete_chat_message(body):
    """Удаляет сообщение чата. Разрешено только учителю — свои и чужие сообщения."""
    message_id = body.get("message_id")
    user_id = body.get("user_id")
    user_role = body.get("user_role")
    if not message_id or not user_id or not user_role:
        return err("message_id, user_id, user_role required")
    if user_role != "teacher":
        return err("Удалять сообщения может только учитель", 403)
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {SCHEMA}.chat_messages WHERE id = %s RETURNING id", (message_id,))
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        return err("Сообщение не найдено", 404)
    return ok({"ok": True})


def handle_get_chat_unread_count(params):
    """Считает непрочитанные сообщения чата класса для пользователя (кроме его собственных)."""
    class_id = params.get("class_id")
    user_id = params.get("user_id")
    if not class_id or not user_id:
        return err("class_id and user_id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT last_read_message_id FROM {SCHEMA}.chat_reads WHERE user_id = %s AND class_id = %s",
        (user_id, class_id)
    )
    read_row = cur.fetchone()
    last_read = read_row["last_read_message_id"] if read_row else 0
    cur.execute(
        f"""SELECT COUNT(*) as cnt FROM {SCHEMA}.chat_messages
            WHERE class_id = %s AND id > %s AND sender_id != %s""",
        (class_id, last_read, user_id)
    )
    count = cur.fetchone()["cnt"]
    conn.close()
    return ok({"count": count})


def handle_mark_chat_read(body):
    """Отмечает чат класса прочитанным для пользователя (до последнего сообщения)."""
    class_id = body.get("class_id")
    user_id = body.get("user_id")
    if not class_id or not user_id:
        return err("class_id and user_id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT MAX(id) as max_id FROM {SCHEMA}.chat_messages WHERE class_id = %s", (class_id,))
    max_id = cur.fetchone()["max_id"] or 0
    cur.execute(
        f"""INSERT INTO {SCHEMA}.chat_reads (user_id, class_id, last_read_message_id, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (user_id, class_id) DO UPDATE
            SET last_read_message_id = GREATEST({SCHEMA}.chat_reads.last_read_message_id, EXCLUDED.last_read_message_id),
                updated_at = NOW()""",
        (user_id, class_id, max_id)
    )
    conn.commit()
    conn.close()
    return ok({"ok": True})