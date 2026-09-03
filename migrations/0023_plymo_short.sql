-- Back to the short form. The AWS detail is stale anyway (now Cloudflare),
-- and naming a host is not what this row is for.

UPDATE work_experiences
SET summary = 'Built end to end. Used by two companies, one a major bank.'
WHERE company = 'Plymo';
