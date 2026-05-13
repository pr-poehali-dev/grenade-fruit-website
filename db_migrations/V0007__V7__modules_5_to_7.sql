
ALTER TABLE modules ALTER COLUMN number TYPE INTEGER;
ALTER TABLE modules DROP CONSTRAINT modules_number_check;
ALTER TABLE modules ADD CONSTRAINT modules_number_check CHECK (number BETWEEN 1 AND 7);

INSERT INTO modules (name, number, date_start, date_end, school_year) VALUES
('5 модуль', 5, '2026-06-01', '2026-06-30', '2025-2026'),
('6 модуль', 6, '2026-09-01', '2026-10-25', '2026-2027'),
('7 модуль', 7, '2026-11-02', '2026-12-27', '2026-2027');
