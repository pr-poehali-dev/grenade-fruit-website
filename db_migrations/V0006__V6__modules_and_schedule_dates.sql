
-- Учебные модули (четверти/триместры)
CREATE TABLE modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    number INTEGER NOT NULL CHECK (number BETWEEN 1 AND 4),
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    school_year VARCHAR(10) NOT NULL DEFAULT '2025-2026',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Расписание на конкретную дату (привязка к модулю)
CREATE TABLE schedule_dates (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id),
    module_id INTEGER REFERENCES modules(id),
    lesson_date DATE NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    time_slot VARCHAR(20) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    teacher_name VARCHAR(200) NOT NULL,
    room VARCHAR(50) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Стандартные модули 2025-2026
INSERT INTO modules (name, number, date_start, date_end, school_year) VALUES
('1 модуль', 1, '2025-09-01', '2025-10-26', '2025-2026'),
('2 модуль', 2, '2025-11-05', '2025-12-28', '2025-2026'),
('3 модуль', 3, '2026-01-12', '2026-03-22', '2025-2026'),
('4 модуль', 4, '2026-04-06', '2026-05-31', '2025-2026');
