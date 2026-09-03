-- Restore the previous portrait (the uncropped desk frame).
-- Version bumped again because /img/* is immutable for a year: anyone who
-- loaded ?v=3 would otherwise keep the photo it replaced.

UPDATE site_profile
SET photo_path = '/img/portrait.webp?v=4'
WHERE id = 1;
