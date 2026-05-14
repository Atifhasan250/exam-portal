import jwt from 'jsonwebtoken'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { isClerkConfigured } from './env'

export const ADMIN_COOKIE_NAME = 'irz_admin_token'

export function signAdminToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' })
}

export async function setAdminCookie(token) {
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24,
  })
}

export async function clearAdminCookie() {
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
}

export async function verifyAdminToken() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  if (!token) return null

  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return null
  }
}

export async function requireAdmin() {
  const admin = await verifyAdminToken()
  if (!admin) {
    return {
      ok: false,
      response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { ok: true, admin }
}

export async function requireUserOrAdmin(expectedUserId) {
  const { userId } = await getClerkSession()
  if (userId && userId === expectedUserId) {
    return { ok: true, role: 'user', userId }
  }

  const admin = await verifyAdminToken()
  if (admin) {
    return { ok: true, role: 'admin', admin }
  }

  return {
    ok: false,
    response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
  }
}

export async function getClerkSession() {
  if (!isClerkConfigured()) return { userId: null }

  try {
    return await auth()
  } catch {
    return { userId: null }
  }
}
