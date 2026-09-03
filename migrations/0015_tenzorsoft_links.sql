-- Link the three client sites named in the Tenzorsoft summary.
--
-- The [label](url) syntax is expanded by src/content/summary.ts, which escapes
-- the whole string before building any anchor — so this stays plain text in
-- the CMS and no raw HTML is ever stored in or rendered from the database.

UPDATE work_experiences
SET summary = '[luvi.uz](https://luvi.uz) stories, [mycoal.uz](https://mycoal.uz) lots, [Kimyo Sanoat](https://uzkimyosanoat.uz) fleet.'
WHERE company = 'Tenzorsoft';
