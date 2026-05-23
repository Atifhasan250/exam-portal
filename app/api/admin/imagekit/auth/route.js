import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { rateLimit } from '@/lib/rateLimit'
import { getImageKitUploadAuth } from '@/lib/imagekit'

export async function GET(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  const limited = await rateLimit(request, {
    name: 'imagekit-auth',
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many upload auth requests.',
  })
  if (limited) return limited

  try {
    return NextResponse.json(getImageKitUploadAuth())
  } catch (error) {
    logger.error('[GET /api/admin/imagekit/auth]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
