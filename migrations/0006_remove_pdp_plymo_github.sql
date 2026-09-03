-- Remove GitHub links from PDP intern and Plymo entries.

UPDATE work_experiences
SET project_links = 'https://plymo.uz'
WHERE id = 3;

UPDATE work_experiences
SET project_links = NULL
WHERE id = 4;

UPDATE projects
SET github_url = NULL
WHERE id = 2;

UPDATE projects
SET github_url = NULL
WHERE id = 3;
