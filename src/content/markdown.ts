import markdownit from 'markdown-it'
import { transform } from 'ultrahtml'
import sanitize from 'ultrahtml/transformers/sanitize'

const md = markdownit({ html: false, linkify: true, typographer: true })

export function renderMarkdown(src: string): string {
  return md.render(src)
}

export async function sanitizeHtml(dirty: string): Promise<string> {
  return transform(dirty, [
    sanitize({
      allowElements: [
        'p', 'br', 'hr', 'blockquote', 'pre', 'code', 'span',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'strong', 'em', 'del', 'a',
        'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'
      ],
      allowAttributes: {
        href: ['a'],
        title: ['a', 'img'],
        src: ['img'],
        alt: ['img'],
        align: ['th', 'td'],
        class: ['code', 'pre', 'span']
      }
    })
  ])
}

export async function renderPostHtml(src: string): Promise<string> {
  return sanitizeHtml(renderMarkdown(src))
}
