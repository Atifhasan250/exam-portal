import DOMPurify from 'dompurify';

export function safeHTML(dirty) {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'br', 'sub', 'sup'],
    ALLOWED_ATTR: []
  });
}
