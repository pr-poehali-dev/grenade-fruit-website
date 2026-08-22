CREATE TABLE IF NOT EXISTS elective_schedule (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    subject VARCHAR(200) NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    lesson_number SMALLINT NOT NULL CHECK (lesson_number IN (0, 5)),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, subject, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_elective_schedule_student_subject ON elective_schedule(student_id, subject);
