import type { Project } from '../../types'

interface ProjectFormProps {
  project: Project | null
  csrf: string
}

export function ProjectForm({ project, csrf }: ProjectFormProps) {
  const isNew = project == null || project.id == null
  return (
    <section class="admin-shell">
      <div class="container">
        <a href="/admin" style="display:inline-flex;align-items:center;gap:8px;font-size:.82em;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:30px;text-decoration:none;">← Dashboard</a>

        <div class="eyebrow">Project</div>
        <h1>{isNew ? 'New project.' : 'Edit project.'}</h1>

        <form class="admin-form" action="/admin/projects" method="post">
          <input type="hidden" name="id" value={project?.id ?? ''} />
          <input type="hidden" name="_csrf" value={csrf} />

          <div class="field">
            <label for="name">Name</label>
            <input type="text" id="name" name="name" value={project?.name ?? ''} required placeholder="Facemash" />
          </div>

          <div class="field">
            <label for="tagline">Tagline <span class="hint">(1 line)</span></label>
            <input type="text" id="tagline" name="tagline" value={project?.tagline ?? ''} placeholder="A Mark Zuckerberg-inspired remix — as a weekend build." />
          </div>

          <div class="field">
            <label for="description">Description</label>
            <textarea id="description" name="description" placeholder="What it is and what was interesting about building it.">{project?.description ?? ''}</textarea>
          </div>

          <div class="field">
            <label for="tech">Tech <span class="hint">(comma-separated)</span></label>
            <input type="text" id="tech" name="tech" value={project?.tech ?? ''} placeholder="Java, Spring Boot, Postgres, Thymeleaf" />
          </div>

          <div class="row-2">
            <div class="field">
              <label for="url">Live URL</label>
              <input type="url" id="url" name="url" value={project?.url ?? ''} placeholder="https://…" />
            </div>
            <div class="field">
              <label for="githubUrl">GitHub URL</label>
              <input type="url" id="githubUrl" name="githubUrl" value={project?.githubUrl ?? ''} placeholder="https://github.com/…" />
            </div>
          </div>

          <div class="row-2">
            <div class="field">
              <label for="imageUrl">Image URL <span class="hint">(optional)</span></label>
              <input type="url" id="imageUrl" name="imageUrl" value={project?.imageUrl ?? ''} placeholder="https://…" />
            </div>
            <div class="field">
              <label for="displayOrder">Display order</label>
              <input type="number" id="displayOrder" name="displayOrder" value={project?.displayOrder ?? 0} />
            </div>
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
