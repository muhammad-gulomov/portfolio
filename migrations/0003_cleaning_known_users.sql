CREATE TABLE cleaning_known_users (
  telegram_user_id INTEGER PRIMARY KEY,
  username TEXT,
  display_name TEXT NOT NULL,
  seen_at TEXT NOT NULL
);

CREATE INDEX idx_cleaning_known_username
  ON cleaning_known_users (username);
