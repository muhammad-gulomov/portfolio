import type { WorkExperience } from '../../types'

// Trim an ISO datetime string to just the date portion "YYYY-MM-DD"
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

interface WorkFormProps {
  work: WorkExperience | null
  csrf: string
}

export function WorkForm({ work, csrf }: WorkFormProps) {
  const isNew = work == null || work.id == null
  return (
    <section class="admin-shell">
      <div class="container">
        <a href="/admin" style="display:inline-flex;align-items:center;gap:8px;font-size:.82em;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:30px;text-decoration:none;">← Dashboard</a>

        <div class="eyebrow">Work</div>
        <h1>{isNew ? 'New experience.' : 'Edit experience.'}</h1>

        <form class="admin-form" action="/admin/work" method="post">
          <input type="hidden" name="id" value={work?.id ?? ''} />
          <input type="hidden" name="_csrf" value={csrf} />

          <div class="row-2">
            <div class="field">
              <label for="role">Role</label>
              <input type="text" id="role" name="role" value={work?.role ?? ''} required placeholder="Backend Engineer" />
            </div>
            <div class="field">
              <label for="company">Company</label>
              <input type="text" id="company" name="company" value={work?.company ?? ''} required placeholder="Yodla" />
            </div>
          </div>

          <div class="row-2">
            <div class="field">
              <label for="location">Location</label>
              <input type="text" id="location" name="location" value={work?.location ?? ''} placeholder="Tashkent · Remote" />
            </div>
            <div class="field">
              <label for="url">Company URL</label>
              <input type="url" id="url" name="url" value={work?.url ?? ''} placeholder="https://…" />
            </div>
          </div>

          <div class="row-2">
            <div class="field">
              <label for="startDate">Start date</label>
              <input type="date" id="startDate" name="startDate" value={toDateInput(work?.startDate)} required />
            </div>
            <div class="field">
              <label for="endDate">End date <span class="hint">(leave blank if current)</span></label>
              <input type="date" id="endDate" name="endDate" value={toDateInput(work?.endDate)} />
            </div>
          </div>

          <div class="field">
            <label for="tech">Tech stack <span class="hint">(comma-separated, e.g. Java, Spring, Postgres)</span></label>
            <input type="text" id="tech" name="tech" value={work?.tech ?? ''} placeholder="Java, Spring Boot, Postgres" />
          </div>

          <div class="field">
            <label for="projectLinks">Project links <span class="hint">(comma-separated URLs — client sites or repos)</span></label>
            <input type="text" id="projectLinks" name="projectLinks" value={work?.projectLinks ?? ''} placeholder="https://project.com, https://github.com/you/repo" />
          </div>

          <div class="field">
            <label for="summary">Summary</label>
            <textarea id="summary" name="summary" placeholder="What you owned, shipped, or changed.">{work?.summary ?? ''}</textarea>
          </div>

          <div class="field">
            <label for="displayOrder">Display order <span class="hint">(lower appears first)</span></label>
            <input type="number" id="displayOrder" name="displayOrder" value={work?.displayOrder ?? 0} />
          </div>

          <div class="form-footer">
            <div class="admin-actions">
              <button type="submit" class="btn primary">Save <span class="arrow">→</span></button>
              <a href="/admin" class="btn">Cancel</a>
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}
