-- Приводим весь текущий учебный год (модули, каникулы, праздники, выезды) к 2026-2027,
-- т.к. даты модулей уже соответствуют периоду сентябрь 2026 — май 2027.

UPDATE modules SET school_year = '2026-2027';
-- исправляем некорректную дату окончания 7 модуля (была раньше даты начала)
UPDATE modules SET date_end = '2027-05-29' WHERE id = 7 AND date_end = '2026-05-29';

-- Переносим каникулы на год вперёд и перемечаем на новый учебный год
UPDATE breaks SET date_start = date_start + INTERVAL '1 year', date_end = date_end + INTERVAL '1 year', school_year = '2026-2027' WHERE school_year = '2025-2026';

-- Переносим праздники на год вперёд и перемечаем на новый учебный год
UPDATE holidays SET holiday_date = holiday_date + INTERVAL '1 year', school_year = '2026-2027' WHERE school_year = '2025-2026';

-- Обновляем значения по умолчанию для новых записей
ALTER TABLE modules ALTER COLUMN school_year SET DEFAULT '2026-2027';
ALTER TABLE breaks ALTER COLUMN school_year SET DEFAULT '2026-2027';
ALTER TABLE holidays ALTER COLUMN school_year SET DEFAULT '2026-2027';
ALTER TABLE trips ALTER COLUMN school_year SET DEFAULT '2026-2027';