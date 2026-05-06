import { NextResponse } from 'next/server'
import { assertServerEnv } from '@/lib/env'
import { rateLimit } from '@/lib/rateLimit'
import { setAdminCookie, signAdminToken } from '@/lib/auth'
import { validate, adminLoginSchema } from '@/lib/validation'
import { logger } from '@/lib/logger'

export async function POST(request) {
  try {
    assertServerEnv()
    const limited = await rateLimit(request, {
      name: 'admin-login',
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: 'Too many login attempts. Try again in 15 minutes.',
    })
    if (limited) return limited

    // ── Validate input ──────────────────────────────────────────────
    const raw = await request.json()
    const parsed = validate(adminLoginSchema, raw)
    if (!parsed.success) return parsed.response

    const { username, password } = parsed.data
    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
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
