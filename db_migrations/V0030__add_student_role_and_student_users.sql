-- Разрешаем новую роль 'student' для логина учеников
ALTER TABLE t_p60010664_grenade_fruit_websit.users DROP CONSTRAINT users_role_check;
ALTER TABLE t_p60010664_grenade_fruit_websit.users ADD CONSTRAINT users_role_check CHECK (role IN ('teacher', 'parent', 'student'));

-- Связь логина ученика с его записью в students (1 ученик = 1 учётная запись)
CREATE TABLE IF NOT EXISTS t_p60010664_grenade_fruit_websit.student_users (
    user_id INTEGER PRIMARY KEY REFERENCES t_p60010664_grenade_fruit_websit.users(id),
    student_id INTEGER NOT NULL UNIQUE REFERENCES t_p60010664_grenade_fruit_websit.students(id)
);
