import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { assertServerEnv, hasAdminPasswordConfigured } from '@/lib/env'
import { rateLimit } from '@/lib/rateLimit'
import { setAdminCookie, signAdminToken } from '@/lib/auth'
import { validate, adminLoginSchema } from '@/lib/validation'
import { logger } from '@/lib/logger'

function timingSafeEqual(a, b) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function verifyPassword(password) {
  const hash = process.env.ADMIN_PASSWORD_HASH
  if (hash) {
    const [algorithm, salt, storedHash] = hash.split(':')
    if (algorithm !== 'scrypt' || !salt || !storedHash) return false

    const derived = crypto.scryptSync(password, salt, 64).toString('hex')
    return timingSafeEqual(derived, storedHash)
  }

  const plainPassword = process.env.ADMIN_PASSWORD || ''
  return timingSafeEqual(password, plainPassword)
}

export async function POST(request) {
  try {
    assertServerEnv()
    if (!hasAdminPasswordConfigured()) {
      throw new Error('Missing environment variable: ADMIN_PASSWORD or ADMIN_PASSWORD_HASH')
    }

    const raw = await request.json()
    const parsed = validate(adminLoginSchema, raw)
    if (!parsed.success) return parsed.response

    const { username, password } = parsed.data

    const limited = await rateLimit(request, {
      name: 'admin-login',
      windowMs: 15 * 60 * 1000,
      max: 5,
      keyParts: [username.toLowerCase()],
      message: 'Too many login attempts. Try again in 15 minutes.',
    })
    if (limited) return limited

    const validUsername = timingSafeEqual(username, process.env.ADMIN_USERNAME)
    const validPassword = verifyPassword(password)
    if (!validUsername || !validPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = signAdminToken({ username })
    await setAdminCookie(token)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[POST /api/admin/login]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
