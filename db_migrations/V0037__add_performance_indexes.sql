-- Индексы на внешние ключи для ускорения основных запросов (JOIN/WHERE),
-- которые раньше делали full table scan (особенно заметно на schedule_dates с 4600+ строк).

CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_archived ON students(is_archived);

CREATE INDEX IF NOT EXISTS idx_parent_students_student_id ON parent_students(student_id);

CREATE INDEX IF NOT EXISTS idx_schedule_class_id ON schedule(class_id);
CREATE INDEX IF NOT EXISTS idx_schedule_teacher_name ON schedule(teacher_name);

CREATE INDEX IF NOT EXISTS idx_schedule_dates_class_id ON schedule_dates(class_id);
CREATE INDEX IF NOT EXISTS idx_schedule_dates_module_id ON schedule_dates(module_id);
CREATE INDEX IF NOT EXISTS idx_schedule_dates_teacher_name ON schedule_dates(teacher_name);
CREATE INDEX IF NOT EXISTS idx_schedule_dates_lesson_date ON schedule_dates(lesson_date);

CREATE INDEX IF NOT EXISTS idx_homework_class_id ON homework(class_id);
CREATE INDEX IF NOT EXISTS idx_homework_teacher_id ON homework(teacher_id);

CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_class_id ON grades(class_id);

CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_lesson_date ON attendance(lesson_date);

CREATE INDEX IF NOT EXISTS idx_recommendations_student_id ON recommendations(student_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_class_id ON recommendations(class_id);

CREATE INDEX IF NOT EXISTS idx_notifications_parent_id_created_at ON notifications(parent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_emailed ON notifications(emailed) WHERE emailed = false;

CREATE INDEX IF NOT EXISTS idx_extended_day_students_student_id ON extended_day_students(student_id);

CREATE INDEX IF NOT EXISTS idx_chat_reads_class_id ON chat_reads(class_id);
