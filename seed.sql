-- seed.sql — idempotent content seed for kanzen-db (D1)
-- Run AFTER migrations/0001_init_schema.sql has been applied.
-- Re-running is safe: INSERT OR IGNORE skips rows that already exist (keyed on id/slug).

-- ---------------------------------------------------------------------------
-- site_profile (singleton id=1)
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO site_profile
  (id, name, handle, tagline, location, email, github, linkedin, telegram, instagram, photo_path)
VALUES
  (1,
   'Muhammad Gulomov',
   'muhammad-gulomov',
   'Software engineer in Tashkent.',
   'Tashkent, Uzbekistan',
   'muhammad-gulomov@proton.me',
   'https://github.com/muhammad-gulomov',
   'https://www.linkedin.com/in/muhammad-gulomov',
   'https://t.me/kanzenn',
   'https://instagram.com/thekanzen',
   '/img/portrait.webp?v=4');

-- ---------------------------------------------------------------------------
-- work_experiences (5 rows, explicit ids)
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO work_experiences
  (id, company, role, location, start_date, end_date, summary, tech, url, project_links, display_order)
VALUES
  (5,
   'Avtodars',
   'Full Stack Engineer',
   'Tashkent, Uzbekistan',
   '2026-07-01',
   NULL,
   'Built from zero — backend, mobile app, landing page, and an admin panel wired into the CRM operators use.',
   NULL,
   'https://avtodars-avtomaktab.uz',
   NULL,
   0),

  (1,
   'Yodla',
   'Software Engineer',
   'Tashkent, Uzbekistan',
   '2026-04-24',
   NULL,
   'Driving-school app, ~500k users. Web, mobile, admin, CRM, payments.',
   'NestJS, React, PostgreSQL',
   'https://yodla-app.uz',
   NULL,
   1),

  (2,
   'Tenzorsoft',
   'Java Backend Developer',
   'Tashkent, Uzbekistan',
   '2026-03-01',
   '2026-04-30',
   '[luvi.uz](https://luvi.uz) stories, [mycoal.uz](https://mycoal.uz) lots, [Kimyo Sanoat](https://uzkimyosanoat.uz) fleet.',
   'Java, Spring Boot, PostgreSQL, CDN, REST API',
   'https://tenzorsoft.com',
   'https://luvi.uz, https://mycoal.uz, https://uzkimyosanoat.uz',
   2),

  (3,
   'Plymo',
   'Founder & Full Stack Engineer',
   'Remote',
   '2025-06-01',
   NULL,
   'Built end to end. Used by two companies, one a major bank.',
   'Java, Spring Boot, SMTP, Docker, AWS EC2',
   'https://plymo.uz',
   'https://plymo.uz',
   3),

  (4,
   'PDP Academy',
   'Java Backend Developer Intern',
   'Tashkent, Uzbekistan',
   '2024-05-01',
   '2024-07-31',
   'Quiz API for a Flutter app.',
   'Java, Spring Boot, JWT, Swagger, Docker, AWS EC2',
   NULL,
   NULL,
   4);

-- ---------------------------------------------------------------------------
-- projects (6 rows, explicit ids)
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO projects
  (id, name, tagline, description, tech, url, github_url, image_url, display_order)
VALUES
  (1,
   'Facemash',
   'Facemash clone, Elo ratings.',
   'Two photos, one click, Elo leaderboard. Spring Boot, Postgres, Thymeleaf.',
   'Java, Spring Boot, Postgres, Thymeleaf',
   NULL,
   'https://github.com/muhammad-gulomov/facemash',
   NULL,
   0),

  (2,
   'Plymo',
   'Team task boards.',
   'Workflow platform for business owners — task boards, columns, and role-based access.',
   'Java, Spring Boot, Thymeleaf, Postgres',
   'https://plymo.uz',
   NULL,
   NULL,
   1),

  (4,
   'Tour Firm',
   'Tour booking app.',
   'Customer-facing tour catalog and booking flow, plus an admin panel for itineraries, customers, and reservations. Classic server-rendered Spring application.',
   'Java, Spring Boot, Thymeleaf, Postgres',
   NULL,
   'https://github.com/muhammad-gulomov/tour-firm-project',
   NULL,
   3);

-- ---------------------------------------------------------------------------
-- blog_posts (1 published welcome post)
-- reading_minutes: ~250 words / 200 wpm ≈ 2 min
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO blog_posts
  (slug, title, excerpt, content, published_at, reading_minutes, views, published)
VALUES
  ('hello-and-welcome-to-the-desk',
   'Hello, and welcome to the desk.',
   'A short note on what this journal is for, who I am, and what you can expect to find here.',
   '## Why another blog?

Most of what I learn about software doesn''t come from tutorials. It comes from **friction** — the hours I spend wrong before I''m right.
This journal is a place to write those hours down.

I''ll post short essays on the things I''m building, the ideas I''m trying on, and the occasional rant about why a dependency update
ruined my afternoon.

## What you''ll find

- Notes on **systems design** — mostly from the Java/Spring world.
- Occasional writing on **product intuition** — what makes small tools feel considered instead of cluttered.
- Build logs from side projects. *Facemash* was one of them. More to come.

## What you won''t

I don''t do "10 things I learned" lists or Monday-morning hustle posts. If an idea doesn''t survive me reading it out loud, it
doesn''t ship here.

---

Thanks for stopping by. If anything here moves you — disagree, agree, or tell me I''m wrong — you can find me on
[LinkedIn](https://www.linkedin.com/in/muhammad-gulomov) or at the email address in the footer.

— *Muhammad*',
   '2026-01-01T00:00:00.000Z',
   2,
   0,
   1);
