-- Point the profile at the portrait shipped as a static asset.
--
-- The photo already sat in R2 and was reachable at /media/profile-photo, but
-- photo_path was NULL so the view never rendered it. The static file is a
-- square crop of the original at 320px / 13KB, against 960x1280 / 212KB —
-- and it is served straight from the asset edge rather than through a Worker
-- fetch to R2. The R2 original is left untouched; uploading a new photo in
-- the admin CMS overwrites photo_path and takes over again.

UPDATE site_profile
SET photo_path = '/img/portrait.webp'
WHERE id = 1;
