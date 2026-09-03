-- Bump the portrait's cache-busting version.
--
-- /img/* is served `immutable, max-age=31536000`, so replacing the file at the
-- same URL would leave every previous visitor on the old image for a year.
-- The query string is part of the browser's cache key, which is the same
-- convention the admin upload path already uses (setPhotoPath writes
-- '/media/profile-photo?v=' + Date.now()).

UPDATE site_profile
SET photo_path = '/img/portrait.webp?v=2'
WHERE id = 1;
