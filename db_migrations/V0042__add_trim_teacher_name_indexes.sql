-- Запросы "моё расписание" у учителя ищут по TRIM(teacher_name) = TRIM(%s), поэтому обычный
-- индекс на teacher_name не используется планировщиком. Добавляем функциональные индексы
-- по TRIM(teacher_name), которые эти конкретные запросы могут использовать напрямую.
CREATE INDEX IF NOT EXISTS idx_schedule_teacher_name_trim ON schedule(TRIM(teacher_name));
CREATE INDEX IF NOT EXISTS idx_schedule_dates_teacher_name_trim ON schedule_dates(TRIM(teacher_name));