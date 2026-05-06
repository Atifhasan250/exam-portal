export const REQUIRED_SERVER_ENV = ['MONGO_URI', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'JWT_SECRET']

export function assertServerEnv(keys = REQUIRED_SERVER_ENV) {
  const missing = keys.filter((key) => !process.env[key])
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`)
  }
}

export function isClerkConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY,
  )
}
