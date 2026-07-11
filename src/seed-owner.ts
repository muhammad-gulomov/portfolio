import type { SiteProfile } from './types'

// Fallback used when the D1 site_profile row doesn't exist yet.
export const SEED_OWNER: SiteProfile = {
  name: 'Muhammad Gulomov',
  handle: 'muhammad-gulomov',
  tagline: 'Software engineer. Builder of quiet systems and loud ideas.',
  location: 'Tashkent, Uzbekistan',
  email: 'muhammad-gulomov@proton.me',
  github: 'https://github.com/muhammad-gulomov',
  linkedin: 'https://www.linkedin.com/in/muhammad-gulomov',
  telegram: 'https://t.me/kanzenn',
  instagram: 'https://instagram.com/kanzen.swe',
  photoPath: null,
}
