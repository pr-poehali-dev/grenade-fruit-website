
-- Каникулы (между модулями)
CREATE TABLE breaks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    school_year VARCHAR(10) NOT NULL DEFAULT '2025-2026',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Праздничные / неучебные дни
CREATE TABLE holidays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    holiday_date DATE NOT NULL UNIQUE,
    school_year VARCHAR(10) NOT NULL DEFAULT '2025-2026',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Каникулы 2025-2026 (стандартные)
INSERT INTO breaks (name, date_start, date_end, school_year) VALUES
('Осенние каникулы', '2025-10-27', '2025-11-04', '2025-2026'),
('Зимние каникулы', '2025-12-29', '2026-01-11', '2025-2026'),
('Весенние каникулы', '2026-03-23', '2026-04-05', '2025-2026');

-- Государственные праздники 2025-2026
INSERT INTO holidays (name, holiday_date, school_year) VALUES
('День народного единства', '2025-11-04', '2025-2026'),
('Новый год', '2026-01-01', '2025-2026'),
('Новый год', '2026-01-02', '2025-2026'),
('Рождество Христово', '2026-01-07', '2025-2026'),
('День защитника Отечества', '2026-02-23', '2025-2026'),
('Международный женский день', '2026-03-08', '2025-2026'),
('Праздник Весны и Труда', '2026-05-01', '2025-2026'),
('День Победы', '2026-05-09', '2025-2026');
