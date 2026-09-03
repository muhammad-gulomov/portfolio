-- Instagram handle correction: kanzen.swe → thekanzen.
-- The redesign surfaces Instagram as a first-class contact link, so the
-- stored value now has to be the account that is actually in use.

UPDATE site_profile
SET instagram = 'https://instagram.com/thekanzen'
WHERE id = 1;
