-- Portfolio copy pass: human voice, Avtodars, Plymo live link, no duplicate Yodla project.

UPDATE site_profile
SET tagline = 'Software engineer in Tashkent.'
WHERE id = 1;

INSERT OR IGNORE INTO work_experiences
  (id, company, role, location, start_date, end_date, summary, tech, url, project_links, display_order)
VALUES
  (5,
   'Avtodars',
   'Full Stack Engineer',
   'Tashkent, Uzbekistan',
   '2026-07-01',
   NULL,
   'Full-stack engineer, on-site.',
   NULL,
   NULL,
   NULL,
   0);

UPDATE work_experiences
SET
  role = 'Software Engineer',
  summary = 'Whole stack for a driving-school app (~500k users): web, iOS/Android, admin, in-house CRM replacing amoCRM, payments, Telegram posting.',
  display_order = 1
WHERE id = 1;

UPDATE work_experiences SET display_order = 2 WHERE id = 2;

UPDATE work_experiences
SET
  summary = 'Built Plymo — team task boards with role-based access. SMTP notifications, deployed on AWS.',
  project_links = 'https://plymo.uz, https://github.com/muhammad-gulomov/Plymo_1.0',
  display_order = 3
WHERE id = 3;

UPDATE work_experiences
SET
  summary = 'Internship: REST API for a Flutter quiz app (courses, tests, JWT).',
  display_order = 4
WHERE id = 4;

UPDATE projects
SET
  tagline = 'Facemash clone with Elo ratings.',
  description = 'Two photos, one click, Elo leaderboard. Spring Boot, Postgres, Thymeleaf.'
WHERE id = 1;

UPDATE projects
SET
  name = 'Plymo',
  tagline = 'Team task boards, used in production.',
  description = 'Workflow platform for business owners — task boards, columns, and role-based access.',
  url = 'https://plymo.uz'
WHERE id = 2;

DELETE FROM projects WHERE id = 5;
