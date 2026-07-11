/**
 * Content derivation helpers — pure functions, no external dependencies.
 * Used by the blog repo to derive slug/excerpt/reading-time when saving a post.
 */

/**
 * Converts an arbitrary string to a URL-safe slug.
 * - NFD-normalize → strip non-[\w-] → lowercase → spaces→"-" → trim "-" → fallback "post"
 */
export function slugify(s: string): string {
  const result = s
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')

  return result || 'post'
}

/**
 * Produces a plain-text excerpt from markdown:
 * strip md punctuation, collapse whitespace, truncate to 220 chars + "…"
 */
export function excerptFrom(md: string): string {
  const plain = md
    .replace(/[#*_`~\[\]()>!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (plain.length <= 220) {
    return plain
  }

  return plain.slice(0, 220) + '…'
}

/**
 * Estimates reading time in minutes: max(1, ceil(words / 220))
 */
export function readingMinutes(md: string): number {
  const words = md.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
}
