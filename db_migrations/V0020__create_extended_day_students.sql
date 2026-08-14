CREATE TABLE IF NOT EXISTS extended_day_students (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id)
);