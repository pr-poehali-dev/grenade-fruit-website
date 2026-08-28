ALTER TABLE t_p60010664_grenade_fruit_websit.recommendations
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;