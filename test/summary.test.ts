import { describe, it, expect } from 'vitest'
import { renderSummary, escapeHtml } from '../src/content/summary'

describe('renderSummary', () => {
  it('leaves plain text untouched', () => {
    expect(renderSummary('Full stack, on-site.')).toBe('Full stack, on-site.')
  })

  it('turns [label](url) into a link', () => {
    expect(renderSummary('[luvi.uz](https://luvi.uz) stories'))
      .toBe('<a href="https://luvi.uz" target="_blank" rel="noopener">luvi.uz</a> stories')
  })

  it('handles several links in one sentence', () => {
    const out = renderSummary(
      '[a](https://a.uz) x, [b](https://b.uz) y, [Kimyo Sanoat](https://c.uz) z.',
    )
    expect(out.match(/<a /g) ?? []).toHaveLength(3)
    // A multi-word label survives intact.
    expect(out).toContain('>Kimyo Sanoat</a>')
  })

  // ── Safety ───────────────────────────────────────────────────────────────
  // Everything below is CMS-authored input, so none of it may reach the page
  // as live markup.

  it('escapes markup in the surrounding text', () => {
    expect(renderSummary('<script>alert(1)</script>'))
      .toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('escapes markup inside a link label', () => {
    const out = renderSummary('[<img src=x onerror=alert(1)>](https://ok.uz)')
    expect(out).not.toContain('<img')
    expect(out).toContain('&lt;img')
  })

  it('refuses non-http schemes, leaving them as text', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,<b>', 'vbscript:x']) {
      const out = renderSummary(`[click](${bad})`)
      expect(out).not.toContain('<a ')
      expect(out).toContain('[click]')
    }
  })

  it('cannot break out of the href attribute', () => {
    // The quote is escaped before the pattern runs, so it can never terminate
    // the attribute we build.
    const out = renderSummary('[x](https://a.uz" onmouseover="alert(1))')
    expect(out).not.toContain('onmouseover="alert(1)"')
    expect(out).not.toMatch(/href="[^"]*"\s+onmouseover/)
  })

  it('escapeHtml covers the five significant characters', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
})
