-- New portrait; bump the cache-busting version.
-- /img/* is immutable for a year, so replacing the file at the same URL
-- would leave every previous visitor looking at the old photo.

UPDATE site_profile
SET photo_path = '/img/portrait.webp?v=3'
WHERE id = 1;
