-- Link the Avtodars row to the company site.
--
-- With url set, the ledger renders the company name as a link (Home.tsx
-- checks w.url), matching how Yodla already behaves. Tenzorsoft and PDP
-- Academy are deliberately left without one: Tenzorsoft resolves on two
-- different domains and pdp.uz answers 402, so either would be a guess or
-- a broken link on a page recruiters read.

UPDATE work_experiences
SET url = 'https://avtodars-avtomaktab.uz'
WHERE company = 'Avtodars';
