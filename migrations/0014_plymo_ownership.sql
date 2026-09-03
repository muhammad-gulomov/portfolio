-- Plymo is his own product, built end to end and now in production.
--
-- "Java Backend Developer" described the freelance contract this row used to
-- be; it undersells owning the whole build. The summary carries the fact that
-- actually matters to a reader — real companies depend on it — and stays on
-- one line so every ledger row keeps the same two-line shape.

UPDATE work_experiences
SET role    = 'Founder & Full Stack Engineer',
    summary = 'Built end to end. Used by two companies, one a major bank.'
WHERE company = 'Plymo';
