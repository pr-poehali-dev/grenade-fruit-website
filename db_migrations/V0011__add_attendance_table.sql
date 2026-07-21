CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    class_id INTEGER REFERENCES classes(id),
    subject VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('absent', 'late')),
    comment TEXT DEFAULT '',
    lesson_date DATE NOT NULL,
    teacher_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);