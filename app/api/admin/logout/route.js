import { NextResponse } from 'next/server'
import { clearAdminCookie } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { enforceSameOrigin } from '@/lib/requestSecurity'

export async function POST(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const limited = await rateLimit(request, {
    name: 'admin-logout',
    windowMs: 60 * 1000,
    max: 30,
    message: 'Too many logout attempts.',
  })
  if (limited) return limited

  await clearAdminCookie()
  return NextResponse.json({ success: true })
}
