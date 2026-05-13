
-- Таблица классов (1А, 1Б ... 7А, 7Б)
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(10) UNIQUE NOT NULL,
    grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 11),
    letter VARCHAR(5) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Добавляем поле class_id в students
ALTER TABLE students ADD COLUMN class_id INTEGER REFERENCES classes(id);

-- Добавляем class_id в schedule
ALTER TABLE schedule ADD COLUMN class_id INTEGER REFERENCES classes(id);

-- Добавляем class_id в homework
ALTER TABLE homework ADD COLUMN class_id INTEGER REFERENCES classes(id);

-- Добавляем class_id в grades
ALTER TABLE grades ADD COLUMN class_id INTEGER REFERENCES classes(id);

-- Добавляем class_id в files
ALTER TABLE files ADD COLUMN class_id INTEGER REFERENCES classes(id);

-- Добавляем class_id в recommendations
ALTER TABLE recommendations ADD COLUMN class_id INTEGER REFERENCES classes(id);

-- Создаём 7 классов (А и Б для каждого)
INSERT INTO classes (name, grade, letter) VALUES
('1А', 1, 'А'), ('1Б', 1, 'Б'),
('2А', 2, 'А'), ('2Б', 2, 'Б'),
('3А', 3, 'А'), ('3Б', 3, 'Б'),
('4А', 4, 'А'), ('4Б', 4, 'Б'),
('5А', 5, 'А'), ('5Б', 5, 'Б'),
('6А', 6, 'А'), ('6Б', 6, 'Б'),
('7А', 7, 'А'), ('7Б', 7, 'Б');

-- Привязываем существующих учеников к 7Б
UPDATE students SET class_id = (SELECT id FROM classes WHERE name = '7Б') WHERE class_name = '7Б';

-- Привязываем существующее расписание к 7Б
UPDATE schedule SET class_id = (SELECT id FROM classes WHERE name = '7Б') WHERE class_name = '7Б';

-- Привязываем homework к 7Б
UPDATE homework SET class_id = (SELECT id FROM classes WHERE name = '7Б') WHERE class_name = '7Б';

-- Поле sort_order в schedule (если нет)
ALTER TABLE schedule ALTER COLUMN sort_order SET DEFAULT 0;
