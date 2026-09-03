-- Shorter copy, drop filler projects.

UPDATE work_experiences SET summary = 'Full stack, on-site.' WHERE id = 5;
UPDATE work_experiences SET summary = 'Driving-school app, ~500k users. Web, mobile, admin, CRM, payments.' WHERE id = 1;
UPDATE work_experiences SET summary = 'luvi.uz stories, mycoal.uz lots, Kimyo Sanoat fleet.' WHERE id = 2;
UPDATE work_experiences SET summary = 'Plymo — team task boards.' WHERE id = 3;
UPDATE work_experiences SET summary = 'Quiz API for a Flutter app.' WHERE id = 4;

UPDATE projects SET tagline = 'Facemash clone, Elo ratings.' WHERE id = 1;
UPDATE projects SET tagline = 'Team task boards.' WHERE id = 2;
UPDATE projects SET tagline = 'Tour booking app.' WHERE id = 4;

DELETE FROM projects WHERE id IN (3, 6);
