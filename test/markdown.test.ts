import { describe, it, expect } from 'vitest'
import { renderPostHtml } from '../src/content/markdown'

describe('markdown', () => {
  it('renders GFM tables', async () => {
    const html = await renderPostHtml('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<table>')
  })
  it('autolinks bare URLs', async () => {
    expect(await renderPostHtml('see https://example.com')).toContain('<a href="https://example.com"')
  })
  it('strips <script>', async () => {
    expect(await renderPostHtml('ok <script>alert(1)</script>')).not.toContain('<script>')
  })
  it('renders bold as <strong>', async () => {
    expect(await renderPostHtml('**bold**')).toContain('<strong>bold</strong>')
  })
  it('blocks dangerous URL schemes in links (markdown-it validateLink)', async () => {
    for (const scheme of ['javascript:alert(1)', 'vbscript:foo', 'data:text/html,<script>']) {
      const html = await renderPostHtml(`[x](${scheme})`)
      expect(html).not.toContain('href="' + scheme.split(':')[0])
    }
    // legitimate links still become anchors
    expect(await renderPostHtml('[ok](https://example.com)')).toContain('<a href="https://example.com"')
  })
})
