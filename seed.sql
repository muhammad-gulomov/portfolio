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
   'Software engineer. Builder of quiet systems and loud ideas.',
   'Tashkent, Uzbekistan',
   'muhammad-gulomov@proton.me',
   'https://github.com/muhammad-gulomov',
   'https://www.linkedin.com/in/muhammad-gulomov',
   'https://t.me/kanzenn',
   'https://instagram.com/kanzen.swe',
   NULL);

-- ---------------------------------------------------------------------------
-- work_experiences (4 rows, explicit ids)
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO work_experiences
  (id, company, role, location, start_date, end_date, summary, tech, url, project_links, display_order)
VALUES
  (1,
   'Yodla',
   'Software Engineer',
   'Tashkent, Uzbekistan',
   '2026-04-24',
   NULL,
   'Own the whole stack of a driving-school education platform: backend, web, mobile, and devops. Lesson flows, payments, the data layer underneath, and the API contracts the clients rely on.',
   'NestJS, React, PostgreSQL',
   'https://yodla-app.uz',
   NULL,
   0),

  (2,
   'Tenzorsoft',
   'Java Backend Developer',
   'Tashkent, Uzbekistan',
   '2026-03-01',
   '2026-04-30',
   'Backend work across the firm''s client portfolio. Owned the full story module for luvi.uz end to end — upload pipeline, media handling, CDN delivery. On mycoal.uz, built the investment module and, separately, the product-lots CRUD that powers the marketplace. On Kimyo Sanoat AJ, wrote the transport-fleet module — vehicles, drivers, and dispatch.',
   'Java, Spring Boot, PostgreSQL, CDN, REST API',
   NULL,
   'https://luvi.uz, https://mycoal.uz, https://uzkimyosanoat.uz',
   1),

  (3,
   'Freelance',
   'Java Backend Developer',
   'Remote',
   '2025-06-01',
   '2025-08-31',
   'Built a workflow platform for business owners — task boards, columns, and role-based access for owners and employees. Wrote an SMTP + cron notification service that emails users when tasks are assigned or started, and shipped both the frontend and backend. Deployed on AWS EC2 behind Docker.',
   'Java, Spring Boot, SMTP, Docker, AWS EC2',
   NULL,
   'https://github.com/muhammad-gulomov/Plymo_1.0',
   2),

  (4,
   'PDP Academy',
   'Java Backend Developer Intern',
   'Tashkent, Uzbekistan',
   '2024-05-01',
   '2024-07-31',
   'Paired with a teammate to build the REST API behind a Flutter quiz app: courses, modules, tests, student progress, and the scoring/ranking math. JWT auth, Swagger docs, Dockerized and shipped to EC2 — reviewed and passed by the academy supervisor, earning our completion certificate.',
   'Java, Spring Boot, JWT, Swagger, Docker, AWS EC2',
   NULL,
   'https://github.com/muhammad-gulomov/pdp-quiz-project-backend',
   3);

-- ---------------------------------------------------------------------------
-- projects (6 rows, explicit ids)
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO projects
  (id, name, tagline, description, tech, url, github_url, image_url, display_order)
VALUES
  (1,
   'Facemash',
   'A weekend homage to Mark Z''s first web hack — rewritten with a slick design and proper Elo math.',
   'Two photos, one click, a running Elo leaderboard. Built on Spring Boot, Postgres, and Thymeleaf. Recent redesign: a dark editorial aesthetic with gold-glow winner animations and an in-place pair swap that avoids full page reloads.',
   'Java, Spring Boot, Postgres, Thymeleaf',
   NULL,
   'https://github.com/muhammad-gulomov/facemash',
   NULL,
   0),

  (2,
   'Plymo 1.0',
   'A solo full-stack build — v1 tagged release, end to end.',
   'The first tagged release of Plymo, a side project shipped solo. Built to practice owning the full path from data model to UI rather than optimizing any single layer.',
   'Java, Spring Boot, Thymeleaf, Postgres',
   NULL,
   'https://github.com/muhammad-gulomov/Plymo_1.0',
   NULL,
   1),

  (3,
   'PDP Quiz Backend',
   'REST API for a quiz platform — question banks, scoring, sessions.',
   'The backend of a quiz-based education project: question banks with multiple formats, a session/answer model, and scoring logic. Built as part of work at PDP Academy.',
   'Java, Spring Boot, Spring Data JPA, Postgres',
   NULL,
   'https://github.com/muhammad-gulomov/pdp-quiz-project-backend',
   NULL,
   2),

  (4,
   'Tour Firm',
   'Full-stack web app for a tour/travel firm — bookings, itineraries, admin.',
   'Customer-facing tour catalog and booking flow, plus an admin panel for itineraries, customers, and reservations. Classic server-rendered Spring application.',
   'Java, Spring Boot, Thymeleaf, Postgres',
   NULL,
   'https://github.com/muhammad-gulomov/tour-firm-project',
   NULL,
   3),

  (5,
   'Yodla platform',
   'A driving-school education app used by students across Uzbekistan.',
   'Consumer-facing lessons, quizzes, practice tests, and a lightweight CMS for instructors. I own backend, web, mobile, and devops end to end.',
   'NestJS, React, PostgreSQL',
   'https://yodla-app.uz',
   NULL,
   NULL,
   4),

  (6,
   'This portfolio',
   'The thing you''re looking at right now.',
   'A small Cloudflare Workers + Hono site running on the edge, with a D1-backed blog, workplace timeline, and secret-URL admin panel. No JavaScript framework — just CSS, markdown, and a bit of IntersectionObserver magic.',
   'TypeScript, Hono, Cloudflare Workers, D1, R2, markdown-it',
   NULL,
   'https://github.com/muhammad-gulomov',
   NULL,
   5);

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
