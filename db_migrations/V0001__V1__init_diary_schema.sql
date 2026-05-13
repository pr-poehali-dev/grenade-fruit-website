
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('teacher', 'parent')),
    display_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    class_name VARCHAR(20) DEFAULT '7Б',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE parent_students (
    parent_id INTEGER REFERENCES users(id),
    student_id INTEGER REFERENCES students(id),
    PRIMARY KEY (parent_id, student_id)
);

CREATE TABLE schedule (
    id SERIAL PRIMARY KEY,
    day_of_week VARCHAR(20) NOT NULL,
    time_slot VARCHAR(20) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    teacher_name VARCHAR(200) NOT NULL,
    room VARCHAR(50) NOT NULL,
    class_name VARCHAR(20) DEFAULT '7Б',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE homework (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(100) NOT NULL,
    task TEXT NOT NULL,
    due_date VARCHAR(50) NOT NULL,
    class_name VARCHAR(20) DEFAULT '7Б',
    teacher_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE grades (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    subject VARCHAR(100) NOT NULL,
    grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 5),
    comment TEXT DEFAULT '',
    teacher_id INTEGER REFERENCES users(id),
    grade_date VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    size_label VARCHAR(50) DEFAULT '',
    teacher_id INTEGER REFERENCES users(id),
    class_name VARCHAR(20) DEFAULT '7Б',
    upload_date VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recommendations (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    teacher_id INTEGER REFERENCES users(id),
    subject VARCHAR(100) NOT NULL,
    text TEXT NOT NULL,
    rec_date VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES users(id),
    text TEXT NOT NULL,
    type VARCHAR(30) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (login, password_hash, role, display_name) VALUES
('teacher_anna', 'teacher2024', 'teacher', 'Анна Сергеевна'),
('teacher_olga', 'teacher2024', 'teacher', 'Ольга Петровна'),
('teacher_mikhail', 'teacher2024', 'teacher', 'Михаил Иванович'),
('parent1', 'parent1pass', 'parent', 'Родитель Петрова'),
('parent2', 'parent2pass', 'parent', 'Родитель Ивановой');

INSERT INTO students (full_name, class_name) VALUES
('Алёша Петров', '7Б'),
('Маша Иванова', '7Б');

INSERT INTO parent_students (parent_id, student_id)
SELECT u.id, s.id FROM users u, students s
WHERE u.login = 'parent1' AND s.full_name = 'Алёша Петров';

INSERT INTO parent_students (parent_id, student_id)
SELECT u.id, s.id FROM users u, students s
WHERE u.login = 'parent2' AND s.full_name = 'Маша Иванова';

INSERT INTO schedule (day_of_week, time_slot, subject, teacher_name, room, sort_order) VALUES
('Понедельник', '08:00–08:45', 'Математика', 'Анна Сергеевна', '305', 1),
('Понедельник', '09:00–09:45', 'Русский язык', 'Ольга Петровна', '201', 2),
('Понедельник', '10:00–10:45', 'История', 'Михаил Иванович', '108', 3),
('Понедельник', '11:00–11:45', 'Физкультура', 'Сергей Николаевич', 'Спортзал', 4),
('Понедельник', '12:00–12:45', 'Биология', 'Наталья Дмитриевна', '404', 5),
('Вторник', '08:00–08:45', 'Физика', 'Пётр Александрович', '302', 1),
('Вторник', '09:00–09:45', 'Математика', 'Анна Сергеевна', '305', 2),
('Вторник', '10:00–10:45', 'Литература', 'Ольга Петровна', '201', 3),
('Вторник', '11:00–11:45', 'Химия', 'Наталья Дмитриевна', '402', 4),
('Среда', '08:00–08:45', 'Математика', 'Анна Сергеевна', '305', 1),
('Среда', '09:00–09:45', 'Английский язык', 'Ирина Владимировна', '112', 2),
('Среда', '10:00–10:45', 'История', 'Михаил Иванович', '108', 3);

INSERT INTO homework (subject, task, due_date) VALUES
('Математика', '§12, упр. 345–350. Решить задачи на стр. 87 №4,5,6', '14 мая'),
('Русский язык', 'Написать сочинение-рассуждение «Что такое дружба» (150–200 слов)', '15 мая'),
('История', 'Прочитать §18–19, ответить на вопросы в конце параграфа', '15 мая'),
('Биология', 'Нарисовать схему строения клетки и подписать все органоиды', '16 мая');

INSERT INTO grades (student_id, subject, grade, comment, grade_date)
SELECT s.id, 'Математика', 5, 'Отлично решил контрольную работу!', '12 мая'
FROM students s WHERE s.full_name = 'Алёша Петров';

INSERT INTO grades (student_id, subject, grade, comment, grade_date)
SELECT s.id, 'Русский язык', 4, 'Хорошая работа, но есть ошибки в пунктуации', '11 мая'
FROM students s WHERE s.full_name = 'Алёша Петров';

INSERT INTO grades (student_id, subject, grade, comment, grade_date)
SELECT s.id, 'История', 3, 'Нужно повторить материал по теме', '10 мая'
FROM students s WHERE s.full_name = 'Маша Иванова';

INSERT INTO grades (student_id, subject, grade, comment, grade_date)
SELECT s.id, 'Биология', 5, 'Прекрасный доклад!', '9 мая'
FROM students s WHERE s.full_name = 'Маша Иванова';

INSERT INTO grades (student_id, subject, grade, comment, grade_date)
SELECT s.id, 'Физика', 4, 'Хорошее понимание темы', '8 мая'
FROM students s WHERE s.full_name = 'Алёша Петров';

INSERT INTO recommendations (student_id, subject, text, rec_date)
SELECT s.id, 'Математика', 'Алёша отлично справляется с алгеброй. Рекомендую записать в математический кружок — там подготовка к олимпиаде. Нужно подтянуть геометрию, уделите 20 минут в день.', '12 мая'
FROM students s WHERE s.full_name = 'Алёша Петров';

INSERT INTO recommendations (student_id, subject, text, rec_date)
SELECT s.id, 'Русский язык', 'Прошу обратить внимание на орфографию. Советую читать вслух по 15–20 минут ежедневно. Отличное сочинение на прошлой неделе!', '11 мая'
FROM students s WHERE s.full_name = 'Алёша Петров';

INSERT INTO recommendations (student_id, subject, text, rec_date)
SELECT s.id, 'Биология', 'Маша показала прекрасные знания. Рекомендую биологический клуб. Небольшие трудности с систематикой — можно использовать карточки для запоминания.', '9 мая'
FROM students s WHERE s.full_name = 'Маша Иванова';

INSERT INTO notifications (parent_id, text, type, is_read)
SELECT u.id, 'Новая отметка по математике: 5 ⭐', 'grade', false
FROM users u WHERE u.login = 'parent1';

INSERT INTO notifications (parent_id, text, type, is_read)
SELECT u.id, 'Добавлено домашнее задание по биологии', 'homework', false
FROM users u WHERE u.login = 'parent1';

INSERT INTO notifications (parent_id, text, type, is_read)
SELECT u.id, 'Новая рекомендация от Ольги Петровны', 'recommendation', true
FROM users u WHERE u.login = 'parent1';
