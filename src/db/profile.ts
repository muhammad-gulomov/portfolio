import type { SiteProfile } from '../types'

const SELECT_PROFILE = `
  SELECT
    name, handle, tagline, location, email,
    github, linkedin, telegram, instagram,
    photo_path AS photoPath
  FROM site_profile WHERE id = 1
`

export async function getProfile(db: D1Database): Promise<SiteProfile | null> {
  return db.prepare(SELECT_PROFILE).first<SiteProfile>()
}

export async function updateProfile(db: D1Database, p: SiteProfile): Promise<void> {
  await db
    .prepare(
      `INSERT INTO site_profile (id, name, handle, tagline, location, email, github, linkedin, telegram, instagram, photo_path)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         handle = excluded.handle,
         tagline = excluded.tagline,
         location = excluded.location,
         email = excluded.email,
         github = excluded.github,
         linkedin = excluded.linkedin,
         telegram = excluded.telegram,
         instagram = excluded.instagram,
         photo_path = excluded.photo_path`,
    )
    .bind(
      p.name, p.handle, p.tagline, p.location, p.email,
      p.github, p.linkedin, p.telegram, p.instagram, p.photoPath,
    )
    .run()
}

export async function setPhotoPath(db: D1Database, path: string): Promise<void> {
  await db
    .prepare('UPDATE site_profile SET photo_path = ? WHERE id = 1')
    .bind(path)
    .run()
}
