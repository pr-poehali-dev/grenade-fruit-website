
CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id),
    name VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    trip_date DATE NOT NULL,
    date_end DATE,
    school_year VARCHAR(10) NOT NULL DEFAULT '2025-2026',
    created_at TIMESTAMP DEFAULT NOW()
);
