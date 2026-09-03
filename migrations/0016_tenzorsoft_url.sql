-- Link the Tenzorsoft row to the company site.
-- Left unlinked in 0012 because .uz and .com both resolved and it was not
-- clear which was theirs; .com is confirmed as the right one.

UPDATE work_experiences
SET url = 'https://tenzorsoft.com'
WHERE company = 'Tenzorsoft';
