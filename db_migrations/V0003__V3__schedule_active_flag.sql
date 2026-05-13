
ALTER TABLE schedule ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
UPDATE schedule SET active = true WHERE active IS NULL;
