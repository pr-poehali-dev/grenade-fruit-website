ALTER TABLE grades ADD COLUMN grade_max INTEGER NULL;

ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_grade_check;

ALTER TABLE grades ADD CONSTRAINT grades_grade_check CHECK (
  (grade_max IS NULL AND grade BETWEEN 1 AND 5)
  OR (grade_max IS NOT NULL AND grade_max > 0 AND grade >= 0 AND grade <= grade_max)
);