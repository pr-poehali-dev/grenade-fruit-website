CREATE TABLE IF NOT EXISTS t_p60010664_grenade_fruit_websit.chat_messages (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES t_p60010664_grenade_fruit_websit.classes(id),
    sender_id INTEGER NOT NULL REFERENCES t_p60010664_grenade_fruit_websit.users(id),
    sender_name VARCHAR(200) NOT NULL,
    sender_role VARCHAR(20) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_class_id ON t_p60010664_grenade_fruit_websit.chat_messages(class_id, created_at);
