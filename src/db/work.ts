import type { WorkExperience } from '../types'

const SELECT_WORK = `
  SELECT
    id, company, role, location,
    start_date AS startDate,
    end_date AS endDate,
    summary, tech, url,
    project_links AS projectLinks,
    display_order AS displayOrder
  FROM work_experiences
`

export async function listWork(db: D1Database): Promise<WorkExperience[]> {
  const { results } = await db
    .prepare(`${SELECT_WORK} ORDER BY display_order ASC, start_date DESC`)
    .all<WorkExperience>()
  return results
}

export async function getWork(db: D1Database, id: number): Promise<WorkExperience | null> {
  return db
    .prepare(`${SELECT_WORK} WHERE id = ?`)
    .bind(id)
    .first<WorkExperience>()
}

/** Returns the id of the inserted or updated row. */
export async function saveWork(db: D1Database, w: WorkExperience): Promise<number> {
  if (!w.id) {
    // INSERT — let AUTOINCREMENT assign id
    const result = await db
      .prepare(
        `INSERT INTO work_experiences
           (company, role, location, start_date, end_date, summary, tech, url, project_links, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        w.company, w.role, w.location,
        w.startDate, w.endDate,
        w.summary, w.tech, w.url,
        w.projectLinks, w.displayOrder,
      )
      .run()
    return result.meta.last_row_id as number
  } else {
    // UPDATE
    await db
      .prepare(
        `UPDATE work_experiences SET
           company = ?, role = ?, location = ?,
           start_date = ?, end_date = ?,
           summary = ?, tech = ?, url = ?,
           project_links = ?, display_order = ?
         WHERE id = ?`,
      )
      .bind(
        w.company, w.role, w.location,
        w.startDate, w.endDate,
        w.summary, w.tech, w.url,
        w.projectLinks, w.displayOrder,
        w.id,
      )
      .run()
    return w.id
  }
}

export async function deleteWork(db: D1Database, id: number): Promise<void> {
  await db
    .prepare('DELETE FROM work_experiences WHERE id = ?')
    .bind(id)
    .run()
}
