ALTER TABLE elective_students
  ADD COLUMN IF NOT EXISTS days TEXT[] NOT NULL DEFAULT ARRAY['Понедельник','Вторник','Среда','Четверг','Пятница'],
  ADD COLUMN IF NOT EXISTS lesson_slot VARCHAR(2) NOT NULL DEFAULT '5';