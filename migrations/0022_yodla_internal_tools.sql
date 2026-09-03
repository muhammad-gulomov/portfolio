-- Add the internal tooling to the Yodla row.
-- Tightened rather than appended: "ending that subscription" folds into
-- "cut costs", which now covers both the licence and the automation.

UPDATE work_experiences
SET summary = 'Backend, mobile and web on a ~500k-user app. Replaced amoCRM with an in-house CRM shaped around how operators work, and built internal tools that automated manual work and cut costs.'
WHERE company = 'Yodla';
