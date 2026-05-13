"""
Главный API для Гранатового Дневника.
Обрабатывает авторизацию, CRUD для всех разделов.
"""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token, X-Session-Id",
    "Access-Control-Max-Age": "86400",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)


def ok(data, status=200):
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass
    params = event.get("queryStringParameters") or {}

    # POST /login
    if method == "POST" and path.endswith("/login"):
        return handle_login(body)

    # GET /schedule
    if method == "GET" and path.endswith("/schedule"):
        return handle_get_schedule(params)

    # POST /schedule (teacher only)
    if method == "POST" and path.endswith("/schedule"):
        return handle_add_schedule(body)

    # GET /homework
    if method == "GET" and path.endswith("/homework"):
        return handle_get_homework()

    # POST /homework
    if method == "POST" and path.endswith("/homework"):
        return handle_add_homework(body)

    # PUT /homework
    if method == "PUT" and "/homework/" in path:
        hw_id = path.rstrip("/").split("/")[-1]
        return handle_update_homework(hw_id, body)

    # GET /grades
    if method == "GET" and path.endswith("/grades"):
        return handle_get_grades(params)

    # POST /grades
    if method == "POST" and path.endswith("/grades"):
        return handle_add_grade(body)

    # GET /files
    if method == "GET" and path.endswith("/files"):
        return handle_get_files()

    # GET /recommendations
    if method == "GET" and path.endswith("/recommendations"):
        return handle_get_recommendations(params)

    # POST /recommendations
    if method == "POST" and path.endswith("/recommendations"):
        return handle_add_recommendation(body)

    # GET /notifications
    if method == "GET" and path.endswith("/notifications"):
        return handle_get_notifications(params)

    # POST /notifications/read
    if method == "POST" and path.endswith("/notifications/read"):
        return handle_mark_read(body)

    # GET /students
    if method == "GET" and path.endswith("/students"):
        return handle_get_students()

    return err("Not found", 404)


# ── Auth ──────────────────────────────────────────────────
def handle_login(body):
    login = body.get("login", "").strip()
    password = body.get("password", "").strip()
    if not login or not password:
        return err("Укажите логин и пароль")

    # Учитель — общий пароль
    if password == "teacher2024":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id, login, display_name, role FROM {SCHEMA}.users WHERE login = %s AND role = 'teacher'", (login,))
        user = cur.fetchone()
        conn.close()
        if user:
            return ok({"id": user["id"], "login": user["login"], "role": user["role"], "display_name": user["display_name"], "child": None, "child_id": None})
        # Создаём нового учителя
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"INSERT INTO {SCHEMA}.users (login, password_hash, role, display_name) VALUES (%s, %s, 'teacher', %s) RETURNING id, login, display_name, role",
                    (login, "teacher2024", login))
        user = cur.fetchone()
        conn.commit()
        conn.close()
        return ok({"id": user["id"], "login": user["login"], "role": user["role"], "display_name": user["display_name"], "child": None, "child_id": None})

    # Родитель
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT u.id, u.login, u.display_name, u.role, s.full_name as child, s.id as child_id FROM {SCHEMA}.users u JOIN {SCHEMA}.parent_students ps ON ps.parent_id = u.id JOIN {SCHEMA}.students s ON s.id = ps.student_id WHERE u.login = %s AND u.password_hash = %s AND u.role = 'parent'", (login, password))
    user = cur.fetchone()
    conn.close()
    if not user:
        return err("Неверный логин или пароль", 401)
    return ok({"id": user["id"], "login": user["login"], "role": user["role"], "display_name": user["display_name"], "child": user["child"], "child_id": user["child_id"]})


# ── Schedule ──────────────────────────────────────────────
def handle_get_schedule(params):
    day = params.get("day")
    conn = get_conn()
    cur = conn.cursor()
    if day:
        cur.execute(f"SELECT * FROM {SCHEMA}.schedule WHERE day_of_week = %s ORDER BY sort_order", (day,))
    else:
        cur.execute(f"SELECT * FROM {SCHEMA}.schedule ORDER BY day_of_week, sort_order")
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_add_schedule(body):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.schedule (day_of_week, time_slot, subject, teacher_name, room) VALUES (%s, %s, %s, %s, %s) RETURNING *",
        (body.get("day_of_week"), body.get("time_slot"), body.get("subject"), body.get("teacher_name"), body.get("room"))
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    return ok(dict(row), 201)


# ── Homework ──────────────────────────────────────────────
def handle_get_homework():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {SCHEMA}.homework ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_add_homework(body):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.homework (subject, task, due_date, teacher_id) VALUES (%s, %s, %s, %s) RETURNING *",
        (body.get("subject"), body.get("task"), body.get("due_date"), body.get("teacher_id"))
    )
    row = cur.fetchone()
    # Уведомление всем родителям
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE role = 'parent'")
    parents = cur.fetchall()
    for p in parents:
        cur.execute(
            f"INSERT INTO {SCHEMA}.notifications (parent_id, text, type) VALUES (%s, %s, 'homework')",
            (p["id"], f"Новое домашнее задание по предмету «{body.get('subject')}» до {body.get('due_date')}")
        )
    conn.commit()
    conn.close()
    return ok(dict(row), 201)


def handle_update_homework(hw_id, body):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"UPDATE {SCHEMA}.homework SET subject = %s, task = %s, due_date = %s WHERE id = %s RETURNING *",
        (body.get("subject"), body.get("task"), body.get("due_date"), hw_id)
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
    conn = get_conn()
    cur = conn.cursor()
    if student_id:
        cur.execute(
            f"SELECT g.*, s.full_name as student_name FROM {SCHEMA}.grades g JOIN {SCHEMA}.students s ON s.id = g.student_id WHERE g.student_id = %s ORDER BY g.created_at DESC",
            (student_id,)
        )
    else:
        cur.execute(f"SELECT g.*, s.full_name as student_name FROM {SCHEMA}.grades g JOIN {SCHEMA}.students s ON s.id = g.student_id ORDER BY g.created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_add_grade(body):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.grades (student_id, subject, grade, comment, grade_date, teacher_id) VALUES (%s, %s, %s, %s, %s, %s) RETURNING *",
        (body.get("student_id"), body.get("subject"), body.get("grade"), body.get("comment", ""), body.get("grade_date"), body.get("teacher_id"))
    )
    row = cur.fetchone()
    # Уведомление родителю ученика
    cur.execute(
        f"SELECT parent_id FROM {SCHEMA}.parent_students WHERE student_id = %s",
        (body.get("student_id"),)
    )
    parents = cur.fetchall()
    for p in parents:
        cur.execute(
            f"INSERT INTO {SCHEMA}.notifications (parent_id, text, type) VALUES (%s, %s, 'grade')",
            (p["parent_id"], f"Новая отметка по {body.get('subject')}: {body.get('grade')} ⭐")
        )
    conn.commit()
    conn.close()
    return ok(dict(row), 201)


# ── Files ─────────────────────────────────────────────────
def handle_get_files():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT f.*, u.display_name as teacher_name FROM {SCHEMA}.files f LEFT JOIN {SCHEMA}.users u ON u.id = f.teacher_id ORDER BY f.created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


# ── Recommendations ───────────────────────────────────────
def handle_get_recommendations(params):
    student_id = params.get("student_id")
    conn = get_conn()
    cur = conn.cursor()
    if student_id:
        cur.execute(
            f"SELECT r.*, s.full_name as student_name, u.display_name as teacher_name FROM {SCHEMA}.recommendations r JOIN {SCHEMA}.students s ON s.id = r.student_id LEFT JOIN {SCHEMA}.users u ON u.id = r.teacher_id WHERE r.student_id = %s ORDER BY r.created_at DESC",
            (student_id,)
        )
    else:
        cur.execute(f"SELECT r.*, s.full_name as student_name, u.display_name as teacher_name FROM {SCHEMA}.recommendations r JOIN {SCHEMA}.students s ON s.id = r.student_id LEFT JOIN {SCHEMA}.users u ON u.id = r.teacher_id ORDER BY r.created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))


def handle_add_recommendation(body):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.recommendations (student_id, subject, text, rec_date, teacher_id) VALUES (%s, %s, %s, %s, %s) RETURNING *",
        (body.get("student_id"), body.get("subject"), body.get("text"), body.get("rec_date"), body.get("teacher_id"))
    )
    row = cur.fetchone()
    # Уведомление родителю
    teacher_name = body.get("teacher_name", "Учитель")
    cur.execute(
        f"SELECT parent_id FROM {SCHEMA}.parent_students WHERE student_id = %s",
        (body.get("student_id"),)
    )
    parents = cur.fetchall()
    for p in parents:
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
    cur.execute(f"SELECT * FROM {SCHEMA}.notifications WHERE parent_id = %s ORDER BY created_at DESC LIMIT 20", (parent_id,))
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


# ── Students ──────────────────────────────────────────────
def handle_get_students():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {SCHEMA}.students ORDER BY full_name")
    rows = cur.fetchall()
    conn.close()
    return ok(list(rows))
