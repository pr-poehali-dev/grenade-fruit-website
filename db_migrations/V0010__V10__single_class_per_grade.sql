
-- Помечаем Б-классы как архивные (скрываем их)
ALTER TABLE t_p60010664_grenade_fruit_websit.classes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Деактивируем Б-классы
UPDATE t_p60010664_grenade_fruit_websit.classes SET is_active = FALSE WHERE id IN (2,4,6,8,10,12,14);

-- Переименовываем А-классы: убираем букву
UPDATE t_p60010664_grenade_fruit_websit.classes SET name = '1', letter = '' WHERE id = 1;
UPDATE t_p60010664_grenade_fruit_websit.classes SET name = '2', letter = '' WHERE id = 3;
UPDATE t_p60010664_grenade_fruit_websit.classes SET name = '3', letter = '' WHERE id = 5;
UPDATE t_p60010664_grenade_fruit_websit.classes SET name = '4', letter = '' WHERE id = 7;
UPDATE t_p60010664_grenade_fruit_websit.classes SET name = '5', letter = '' WHERE id = 9;
UPDATE t_p60010664_grenade_fruit_websit.classes SET name = '6', letter = '' WHERE id = 11;
UPDATE t_p60010664_grenade_fruit_websit.classes SET name = '7', letter = '' WHERE id = 13;
