ALTER TABLE t_p60010664_grenade_fruit_websit.elective_students
  ADD COLUMN IF NOT EXISTS day_slots JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE t_p60010664_grenade_fruit_websit.elective_students
SET day_slots = (
  SELECT jsonb_object_agg(d, lesson_slot)
  FROM unnest(days) AS d
)
WHERE day_slots = '{}'::jsonb AND days IS NOT NULL AND array_length(days, 1) > 0;