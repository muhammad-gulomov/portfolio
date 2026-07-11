CREATE TABLE site_profile (            -- singleton id=1
  id INTEGER PRIMARY KEY, name TEXT, handle TEXT, tagline TEXT, location TEXT,
  email TEXT, github TEXT, linkedin TEXT, telegram TEXT, instagram TEXT,
  photo_path TEXT
);
CREATE TABLE work_experiences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL, role TEXT NOT NULL, location TEXT,
  start_date TEXT NOT NULL, end_date TEXT, summary TEXT, tech TEXT,
  url TEXT, project_links TEXT, display_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, tagline TEXT, description TEXT, tech TEXT,
  url TEXT, github_url TEXT, image_url TEXT, display_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, excerpt TEXT,
  content TEXT NOT NULL, published_at TEXT NOT NULL,
  reading_minutes INTEGER NOT NULL, views INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE admin_account (           -- singleton id=1
  id INTEGER PRIMARY KEY, username TEXT NOT NULL, password_hash TEXT NOT NULL
);
