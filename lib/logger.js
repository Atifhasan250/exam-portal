const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'jwt',
])

/**
 * Recursively strip sensitive fields from an object for safe logging.
 */
function sanitizeForLog(obj, depth = 0) {
  if (depth > 4 || obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  if (obj instanceof Error) {
    return { message: obj.message, stack: process.env.NODE_ENV === 'development' ? obj.stack : undefined }
  }

  const sanitized = Array.isArray(obj) ? [] : {}
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = sanitizeForLog(value, depth + 1)
    }
  }
  return sanitized
}

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString()
  const cleanMeta = meta ? sanitizeForLog(meta) : undefined

  if (process.env.NODE_ENV === 'production') {
    // Structured JSON for log aggregators (Logtail, Vercel Log Drains, etc.)
    return JSON.stringify({ timestamp, level, message, ...(cleanMeta || {}) })
  }

  // Pretty-print for development
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`
  if (cleanMeta) {
    return `${prefix} ${message} ${JSON.stringify(cleanMeta, null, 2)}`
  }
  return `${prefix} ${message}`
}

export const logger = {
  info(message, meta) {
    console.log(formatMessage('info', message, meta))
  },

  warn(message, meta) {
    console.warn(formatMessage('warn', message, meta))
  },

  error(message, meta) {
    console.error(formatMessage('error', message, meta))
  },

  /**
   * Returns a generic error message safe for client responses.
   * In dev, includes the original message for debugging.
   */
  safeErrorMessage(error) {
    if (process.env.NODE_ENV === 'development') {
      return error?.message || 'Internal server error'
    }
    return 'Internal server error'
  },
}
