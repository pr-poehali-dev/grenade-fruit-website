CREATE TABLE IF NOT EXISTS elective_subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO elective_subjects (name) VALUES
    ('Китайский язык (факультатив)'),
    ('STEM (факультатив)'),
    ('ОФП (факультатив)'),
    ('Шоу-лаборатория (факультатив)'),
    ('Занимательный русский язык (факультатив)'),
    ('Мышематика (факультатив)'),
    ('История архитектуры (факультатив)')
ON CONFLICT (name) DO NOTHING;