CREATE TABLE IF NOT EXISTS t_p60010664_grenade_fruit_websit.chat_reads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p60010664_grenade_fruit_websit.users(id),
    class_id INTEGER NOT NULL REFERENCES t_p60010664_grenade_fruit_websit.classes(id),
    last_read_message_id INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, class_id)
);
