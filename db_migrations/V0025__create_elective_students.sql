CREATE TABLE IF NOT EXISTS elective_students (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    subject VARCHAR(200) NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, subject)
);