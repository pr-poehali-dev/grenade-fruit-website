ALTER TABLE t_p60010664_grenade_fruit_websit.extended_day_students
  ADD COLUMN IF NOT EXISTS days TEXT[] NOT NULL DEFAULT ARRAY['Понедельник','Вторник','Среда','Четверг','Пятница'];