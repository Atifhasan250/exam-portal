'use client'

import DOMPurify from 'dompurify'

export function safeHTML(dirty) {
  if (!dirty) return ''

  const withLineBreaks = String(dirty)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '<br>')

  return DOMPurify.sanitize(withLineBreaks, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'br', 'sub', 'sup'],
    ALLOWED_ATTR: [],
  })
}
