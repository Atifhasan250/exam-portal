export const REQUIRED_SERVER_ENV = [
  'MONGO_URI',
  'ADMIN_USERNAME',
  'JWT_SECRET',
]

export function assertServerEnv(keys = REQUIRED_SERVER_ENV) {
  const missing = keys.filter((key) => !process.env[key])
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`)
  }
}

export function hasAdminPasswordConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_HASH)
}

export function assertAdminSecurityEnv() {
  const secret = process.env.JWT_SECRET || ''
  if (secret.length < 48) {
    throw new Error('JWT_SECRET must be at least 48 characters long')
  }

  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD_HASH) {
    throw new Error('ADMIN_PASSWORD_HASH is required in production')
  }

  if (process.env.NODE_ENV === 'production' && process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD is not allowed in production; use ADMIN_PASSWORD_HASH only')
  }
}
