import type { Project } from '../types'

const SELECT_PROJECT = `
  SELECT
    id, name, tagline, description, tech, url,
    github_url AS githubUrl,
    image_url AS imageUrl,
    display_order AS displayOrder
  FROM projects
`

export async function listProjects(db: D1Database): Promise<Project[]> {
  const { results } = await db
    .prepare(`${SELECT_PROJECT} ORDER BY display_order ASC`)
    .all<Project>()
  return results
}

export async function getProject(db: D1Database, id: number): Promise<Project | null> {
  return db
    .prepare(`${SELECT_PROJECT} WHERE id = ?`)
    .bind(id)
    .first<Project>()
}

/** Returns the id of the inserted or updated row. */
export async function saveProject(db: D1Database, p: Project): Promise<number> {
  if (!p.id) {
    // INSERT — let AUTOINCREMENT assign id
    const result = await db
      .prepare(
        `INSERT INTO projects
           (name, tagline, description, tech, url, github_url, image_url, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        p.name, p.tagline, p.description, p.tech,
        p.url, p.githubUrl, p.imageUrl, p.displayOrder,
      )
      .run()
    return result.meta.last_row_id as number
  } else {
    // UPDATE
    await db
      .prepare(
        `UPDATE projects SET
           name = ?, tagline = ?, description = ?, tech = ?,
           url = ?, github_url = ?, image_url = ?, display_order = ?
         WHERE id = ?`,
      )
      .bind(
        p.name, p.tagline, p.description, p.tech,
        p.url, p.githubUrl, p.imageUrl, p.displayOrder,
        p.id,
      )
      .run()
    return p.id
  }
}

export async function deleteProject(db: D1Database, id: number): Promise<void> {
  await db
    .prepare('DELETE FROM projects WHERE id = ?')
    .bind(id)
    .run()
}
