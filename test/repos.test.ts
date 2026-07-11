import { env } from 'cloudflare:workers'
import { describe, it, expect, beforeEach } from 'vitest'
import type { Env } from '../src/types'
import { getProfile, updateProfile, setPhotoPath } from '../src/db/profile'
import { getAccount, countAccounts, seedAccount, updateCredentials } from '../src/db/account'
import { listWork, getWork, saveWork, deleteWork } from '../src/db/work'
import { listProjects, getProject, saveProject, deleteProject } from '../src/db/project'

const db = (env as unknown as Env).DB

// Clean all tables before each test to ensure isolation
beforeEach(async () => {
  await db.exec('DELETE FROM site_profile')
  await db.exec('DELETE FROM admin_account')
  await db.exec('DELETE FROM work_experiences')
  await db.exec('DELETE FROM projects')
})

// ─── Profile ──────────────────────────────────────────────────────────────────

describe('profile', () => {
  it('getProfile returns null when empty', async () => {
    const result = await getProfile(db)
    expect(result).toBeNull()
  })

  it('updateProfile then getProfile round-trip', async () => {
    const profile = {
      name: 'Muhammad',
      handle: '@muh',
      tagline: 'Full-stack dev',
      location: 'Tashkent',
      email: 'test@example.com',
      github: 'https://github.com/muh',
      linkedin: 'https://linkedin.com/in/muh',
      telegram: '@muh_tg',
      instagram: '@muh_ig',
      photoPath: '/uploads/photo.jpg',
    }
    await updateProfile(db, profile)
    const result = await getProfile(db)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Muhammad')
    expect(result!.handle).toBe('@muh')
    expect(result!.photoPath).toBe('/uploads/photo.jpg') // snake_case aliasing check
  })

  it('updateProfile is idempotent (UPSERT)', async () => {
    const base = {
      name: 'V1', handle: 'h', tagline: 't', location: 'l',
      email: 'e@e.com', github: 'g', linkedin: 'li', telegram: 'tg', instagram: 'ig',
      photoPath: null,
    }
    await updateProfile(db, base)
    await updateProfile(db, { ...base, name: 'V2' })
    const result = await getProfile(db)
    expect(result!.name).toBe('V2')
    // Only one row
    const { results } = await db.prepare('SELECT COUNT(*) AS n FROM site_profile').all<{ n: number }>()
    expect(results[0].n).toBe(1)
  })

  it('setPhotoPath updates photo_path', async () => {
    const base = {
      name: 'M', handle: 'h', tagline: 't', location: 'l',
      email: 'e@e.com', github: 'g', linkedin: 'li', telegram: 'tg', instagram: 'ig',
      photoPath: null,
    }
    await updateProfile(db, base)
    await setPhotoPath(db, '/new/photo.png')
    const result = await getProfile(db)
    expect(result!.photoPath).toBe('/new/photo.png')
  })
})

// ─── Account ──────────────────────────────────────────────────────────────────

describe('account', () => {
  it('countAccounts returns 0 when empty', async () => {
    const n = await countAccounts(db)
    expect(n).toBe(0)
  })

  it('seedAccount then getAccount round-trip', async () => {
    await seedAccount(db, 'admin', 'hash123')
    const account = await getAccount(db)
    expect(account).not.toBeNull()
    expect(account!.username).toBe('admin')
    expect(account!.passwordHash).toBe('hash123') // snake_case aliasing check
    expect(account!.id).toBe(1)
  })

  it('seedAccount + countAccounts', async () => {
    await seedAccount(db, 'admin', 'hash')
    const n = await countAccounts(db)
    expect(n).toBe(1)
  })

  it('seedAccount is idempotent (INSERT OR IGNORE)', async () => {
    await seedAccount(db, 'admin', 'hash1')
    await seedAccount(db, 'admin2', 'hash2') // should be ignored
    const n = await countAccounts(db)
    expect(n).toBe(1)
    const account = await getAccount(db)
    expect(account!.username).toBe('admin') // original unchanged
  })

  it('updateCredentials updates only username (password unchanged)', async () => {
    await seedAccount(db, 'admin', 'original_hash')
    await updateCredentials(db, { username: 'newadmin' })
    const account = await getAccount(db)
    expect(account!.username).toBe('newadmin')
    expect(account!.passwordHash).toBe('original_hash') // must be unchanged
  })

  it('updateCredentials updates only passwordHash (username unchanged)', async () => {
    await seedAccount(db, 'admin', 'old_hash')
    await updateCredentials(db, { passwordHash: 'new_hash' })
    const account = await getAccount(db)
    expect(account!.username).toBe('admin') // unchanged
    expect(account!.passwordHash).toBe('new_hash')
  })

  it('updateCredentials with both fields updates both', async () => {
    await seedAccount(db, 'admin', 'old_hash')
    await updateCredentials(db, { username: 'newadmin', passwordHash: 'new_hash' })
    const account = await getAccount(db)
    expect(account!.username).toBe('newadmin')
    expect(account!.passwordHash).toBe('new_hash')
  })

  it('updateCredentials with no fields is a no-op', async () => {
    await seedAccount(db, 'admin', 'hash')
    await updateCredentials(db, {}) // no-op
    const account = await getAccount(db)
    expect(account!.username).toBe('admin')
    expect(account!.passwordHash).toBe('hash')
  })
})

// ─── Work ─────────────────────────────────────────────────────────────────────

describe('work', () => {
  it('listWork returns empty array initially', async () => {
    const results = await listWork(db)
    expect(results).toEqual([])
  })

  it('saveWork INSERT then getWork round-trip (camelCase aliasing)', async () => {
    const id = await saveWork(db, {
      id: 0, // falsy → INSERT
      company: 'Acme',
      role: 'Engineer',
      location: 'Remote',
      startDate: '2023-01',
      endDate: '2024-01',
      summary: 'Did stuff',
      tech: 'TS, Node',
      url: 'https://acme.com',
      projectLinks: 'https://proj.com',
      displayOrder: 1,
    })
    expect(typeof id).toBe('number')
    expect(id).toBeGreaterThan(0)

    const w = await getWork(db, id)
    expect(w).not.toBeNull()
    expect(w!.company).toBe('Acme')
    expect(w!.startDate).toBe('2023-01') // aliased from start_date
    expect(w!.endDate).toBe('2024-01')   // aliased from end_date
    expect(w!.projectLinks).toBe('https://proj.com') // aliased from project_links
    expect(w!.displayOrder).toBe(1)      // aliased from display_order
    expect(w!.id).toBe(id)
  })

  it('saveWork UPDATE preserves id', async () => {
    const id = await saveWork(db, {
      id: 0,
      company: 'Old',
      role: 'Dev',
      location: null,
      startDate: '2022-01',
      endDate: null,
      summary: null,
      tech: null,
      url: null,
      projectLinks: null,
      displayOrder: 0,
    })
    await saveWork(db, {
      id,
      company: 'New',
      role: 'Dev',
      location: null,
      startDate: '2022-01',
      endDate: null,
      summary: null,
      tech: null,
      url: null,
      projectLinks: null,
      displayOrder: 0,
    })
    const w = await getWork(db, id)
    expect(w!.company).toBe('New')
    expect(w!.id).toBe(id)
    const all = await listWork(db)
    expect(all.length).toBe(1) // still one row
  })

  it('listWork orders by display_order ASC then start_date DESC', async () => {
    await saveWork(db, {
      id: 0, company: 'Second', role: 'Dev', location: null,
      startDate: '2021-01', endDate: null, summary: null, tech: null,
      url: null, projectLinks: null, displayOrder: 2,
    })
    await saveWork(db, {
      id: 0, company: 'First', role: 'Dev', location: null,
      startDate: '2022-01', endDate: null, summary: null, tech: null,
      url: null, projectLinks: null, displayOrder: 1,
    })
    await saveWork(db, {
      id: 0, company: 'ThirdNewest', role: 'Dev', location: null,
      startDate: '2023-01', endDate: null, summary: null, tech: null,
      url: null, projectLinks: null, displayOrder: 2,
    })
    const results = await listWork(db)
    expect(results[0].company).toBe('First')        // displayOrder=1
    expect(results[1].company).toBe('ThirdNewest')  // displayOrder=2, startDate=2023 (newer)
    expect(results[2].company).toBe('Second')       // displayOrder=2, startDate=2021 (older)
  })

  it('deleteWork removes the row', async () => {
    const id = await saveWork(db, {
      id: 0, company: 'ToDelete', role: 'Dev', location: null,
      startDate: '2022-01', endDate: null, summary: null, tech: null,
      url: null, projectLinks: null, displayOrder: 0,
    })
    await deleteWork(db, id)
    const w = await getWork(db, id)
    expect(w).toBeNull()
  })
})

// ─── Projects ─────────────────────────────────────────────────────────────────

describe('projects', () => {
  it('listProjects returns empty array initially', async () => {
    const results = await listProjects(db)
    expect(results).toEqual([])
  })

  it('saveProject INSERT then getProject round-trip (camelCase aliasing)', async () => {
    const id = await saveProject(db, {
      id: 0,
      name: 'My App',
      tagline: 'Cool app',
      description: 'A cool app',
      tech: 'React, TS',
      url: 'https://myapp.com',
      githubUrl: 'https://github.com/user/myapp',
      imageUrl: '/img/myapp.png',
      displayOrder: 1,
    })
    expect(typeof id).toBe('number')
    expect(id).toBeGreaterThan(0)

    const p = await getProject(db, id)
    expect(p).not.toBeNull()
    expect(p!.name).toBe('My App')
    expect(p!.githubUrl).toBe('https://github.com/user/myapp') // aliased from github_url
    expect(p!.imageUrl).toBe('/img/myapp.png')                  // aliased from image_url
    expect(p!.displayOrder).toBe(1)                             // aliased from display_order
    expect(p!.id).toBe(id)
  })

  it('saveProject UPDATE preserves id', async () => {
    const id = await saveProject(db, {
      id: 0, name: 'Old', tagline: null, description: null, tech: null,
      url: null, githubUrl: null, imageUrl: null, displayOrder: 0,
    })
    await saveProject(db, {
      id, name: 'New', tagline: null, description: null, tech: null,
      url: null, githubUrl: null, imageUrl: null, displayOrder: 0,
    })
    const p = await getProject(db, id)
    expect(p!.name).toBe('New')
    expect(p!.id).toBe(id)
    const all = await listProjects(db)
    expect(all.length).toBe(1)
  })

  it('listProjects orders by display_order ASC', async () => {
    await saveProject(db, {
      id: 0, name: 'Third', tagline: null, description: null, tech: null,
      url: null, githubUrl: null, imageUrl: null, displayOrder: 3,
    })
    await saveProject(db, {
      id: 0, name: 'First', tagline: null, description: null, tech: null,
      url: null, githubUrl: null, imageUrl: null, displayOrder: 1,
    })
    await saveProject(db, {
      id: 0, name: 'Second', tagline: null, description: null, tech: null,
      url: null, githubUrl: null, imageUrl: null, displayOrder: 2,
    })
    const results = await listProjects(db)
    expect(results[0].name).toBe('First')
    expect(results[1].name).toBe('Second')
    expect(results[2].name).toBe('Third')
  })

  it('deleteProject removes the row', async () => {
    const id = await saveProject(db, {
      id: 0, name: 'ToDelete', tagline: null, description: null, tech: null,
      url: null, githubUrl: null, imageUrl: null, displayOrder: 0,
    })
    await deleteProject(db, id)
    const p = await getProject(db, id)
    expect(p).toBeNull()
  })
})
