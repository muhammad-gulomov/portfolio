-- What the Yodla role actually covered.
--
-- "cut costs by 100%" is rendered as "ending that subscription": the amoCRM
-- licence did go to zero, but a reader parses "100%" as a company with no
-- costs and discounts the whole line. Naming the tool that was replaced is
-- both true and harder to dismiss.

UPDATE work_experiences
SET summary = 'Backend, mobile and web on a ~500k-user app. Built the in-house CRM that replaced amoCRM — ending that subscription, and shaped around how operators actually work.'
WHERE company = 'Yodla';
