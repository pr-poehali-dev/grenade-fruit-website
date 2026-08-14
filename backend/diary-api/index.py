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
    if action == "get_parents":
        return handle_get_parents(params)
    if action == "add_parent":
        return handle_add_parent(body)
    if action == "delete_parent":
        return handle_delete_parent(body)
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
    if action == "get_notifications":
        return handle_get_notifications(params)
    if action == "mark_read":
        return handle_mark_read(body)
    if action == "update_email":
        return handle_update_email(body)
    if action == "run_daily_digest":
        return handle_run_daily_digest()
    if action == "get_extended_day_students":
        return handle_get_extended_day_students()
    if action == "add_extended_day_student":
        return handle_add_extended_day_student(body)
    if action == "remove_extended_day_student":
        return handle_remove_extended_day_student(body)

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
    if not user:
        conn.close()
        return err("Неверный логин или пароль", 401)
    cur.execute(f"UPDATE {SCHEMA}.users SET last_login_at = NOW() WHERE id = %s", (user["id"],))
    conn.commit()
    conn.close()
    return ok({"id": user["id"], "login": user["login"], "role": user["role"],
               "display_name": user["display_name"], "child": user["child"],
               "child_id": user["child_id"], "class_id": user["class_id"], "email": user["email"]})


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
                ORDER BY sd.lesson_date, sd.sort_order""",
            (teacher_name, school_year or "2026-2027")
        )
    elif lesson_date:
        cur.execute(
            f"""SELECT * FROM {SCHEMA}.schedule_dates
                WHERE class_id = %s AND lesson_date = %s
                ORDER BY sort_order""",
            (class_id, lesson_date)
        )
    elif module_id and class_id:
        cur.execute(
            f"""SELECT * FROM {SCHEMA}.schedule_dates
                WHERE class_id = %s AND module_id = %s
                ORDER BY lesson_date, sort_order""",
            (class_id, module_id)
        )
    else:
        cur.execute(
            f"SELECT * FROM {SCHEMA}.schedule_dates WHERE class_id = %s ORDER BY lesson_date, sort_order",
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
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""INSERT INTO {SCHEMA}.grades (student_id, subject, grade, comment, grade_date, teacher_id, class_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *""",
        (body.get("student_id"), body.get("subject"), body.get("grade"),
         body.get("comment", ""), body.get("grade_date"), body.get("teacher_id"), body.get("class_id"))
    )
    row = cur.fetchone()
    cur.execute(f"SELECT parent_id FROM {SCHEMA}.parent_students WHERE student_id = %s", (body.get("student_id"),))
    for p in cur.fetchall():
        cur.execute(
            f"INSERT INTO {SCHEMA}.notifications (parent_id, text, type) VALUES (%s, %s, 'grade')",
            (p["parent_id"], f"Новая отметка по {body.get('subject')}: {body.get('grade')} ⭐")
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

    if body.get("student_id") == "all":
        cur.execute(f"SELECT id FROM {SCHEMA}.students WHERE class_id = %s AND is_archived IS NOT TRUE", (class_id,))
        student_ids = [s["id"] for s in cur.fetchall()]
        rows = []
        for sid in student_ids:
            cur.execute(
                f"""INSERT INTO {SCHEMA}.recommendations (student_id, subject, text, rec_date, teacher_id, class_id)
                    VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
                (sid, body.get("subject"), body.get("text"), body.get("rec_date"), body.get("teacher_id"), class_id)
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
        f"""INSERT INTO {SCHEMA}.recommendations (student_id, subject, text, rec_date, teacher_id, class_id)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
        (body.get("student_id"), body.get("subject"), body.get("text"),
         body.get("rec_date"), body.get("teacher_id"), class_id)
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
    parent_id = body.get("parent_id")
    if not parent_id:
        return err("parent_id required")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"UPDATE {SCHEMA}.notifications SET is_read = true WHERE parent_id = %s", (parent_id,))
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
                   c.grade, c.letter
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