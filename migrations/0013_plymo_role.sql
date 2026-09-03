-- The Freelance row becomes Plymo itself.
--
-- It is his own product and still ongoing, so end_date goes NULL — which is
-- what the ledger reads to render "Present" in the accent colour. The summary
-- loses its "Plymo — " prefix, which would now repeat the company name in the
-- same row. display_order is left alone: the list is ordered by start date
-- descending, and Plymo started Jun 2025.

UPDATE work_experiences
SET company  = 'Plymo',
    end_date = NULL,
    url      = 'https://plymo.uz',
    summary  = 'Team task boards.'
WHERE company = 'Freelance';
