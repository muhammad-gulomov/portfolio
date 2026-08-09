-- Cleaning-turn Telegram bot (single bound group)
CREATE TABLE cleaning_group (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  chat_id INTEGER NOT NULL,
  current_member_id INTEGER,
  bound_at TEXT NOT NULL
);

CREATE TABLE cleaning_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id INTEGER NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  username TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE cleaning_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_date TEXT NOT NULL UNIQUE,
  duty_user_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'voting', 'passed', 'failed')),
  vote_message_id INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE cleaning_votes (
  day_id INTEGER NOT NULL,
  voter_user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (day_id, voter_user_id),
  FOREIGN KEY (day_id) REFERENCES cleaning_days(id)
);
