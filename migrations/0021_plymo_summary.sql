-- Spell out what "end to end" covered on Plymo, matching how the Avtodars
-- and Yodla rows now read. Detail drawn from the row's own tech field
-- (Spring Boot, SMTP, Docker, AWS EC2) and the product description.

UPDATE work_experiences
SET summary = 'Built end to end — backend, frontend, and deployment on AWS. Task boards with role-based access, running at two companies, one a major bank.'
WHERE company = 'Plymo';
