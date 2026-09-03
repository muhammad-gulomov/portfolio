/**
 * Renders a work-experience summary, allowing links inside the sentence.
 *
 * Summaries are CMS content — anything typed into the admin form ends up here
 * — so the text is NEVER rendered raw. The order matters and is the whole
 * safety argument:
 *
 *   1. escape the entire string, so any markup the author typed becomes inert
 *      text ("<script>" can no longer be a tag),
 *   2. only then upgrade [label](url) into an anchor that WE build.
 *
 * Doing it the other way round — injecting anchors and escaping afterwards —
 * would either break our own tags or leave a hole. Because the escape happens
 * first, the label cannot carry markup and the URL cannot contain a quote to
 * break out of the href attribute; and the pattern only accepts http(s), so a
 * javascript: URL is left as plain text.
 *
 * Markdown's link syntax is borrowed rather than markdown itself: the field
 * stays plain text in the CMS, and exactly one feature is supported.
 */

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c])
}

const LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g

export function renderSummary(text: string): string {
  return escapeHtml(text).replace(
    LINK,
    (_match, label: string, url: string) =>
      `<a href="${url}" target="_blank" rel="noopener">${label}</a>`,
  )
}
