
ALTER TABLE classes ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);

UPDATE classes SET display_name = '1 класс (Альфа)' WHERE grade = 1;
UPDATE classes SET display_name = '2 класс (Бета)' WHERE grade = 2;
UPDATE classes SET display_name = '3 класс (Гамма)' WHERE grade = 3;
UPDATE classes SET display_name = '4 класс (Дельта)' WHERE grade = 4;
UPDATE classes SET display_name = '5 класс (Эпсилон)' WHERE grade = 5;
UPDATE classes SET display_name = '6 класс' WHERE grade = 6;
UPDATE classes SET display_name = '7 класс' WHERE grade = 7;
