import { NextResponse } from 'next/server'
import crypto from 'node:crypto'

export function getTrustedClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const forwardedIp = forwardedFor?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()
  const vercelIp = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()

  return vercelIp || forwardedIp || realIp || 'local'
}

export function timingSafeEqualString(a = '', b = '') {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

export function isAuthorizedCronRequest(request) {
  const secret = process.env.CRON_SECRET || ''
  if (!secret) return false

  const authHeader = request.headers.get('authorization') || ''
  const bearerPrefix = 'Bearer '
  if (authHeader.startsWith(bearerPrefix)) {
    return timingSafeEqualString(authHeader.slice(bearerPrefix.length), secret)
  }

  return timingSafeEqualString(request.headers.get('x-cron-secret') || '', secret)
}

export function enforceSameOrigin(request) {
  const origin = request.headers.get('origin')
  if (!origin) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Missing request origin' }, { status: 403 })
    }
    return null
  }

  const requestOrigin = new URL(request.url).origin
  if (origin === requestOrigin) return null

  return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
}
