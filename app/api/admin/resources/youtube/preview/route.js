import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { rateLimit } from '@/lib/rateLimit'
import { validate, youtubePreviewSchema } from '@/lib/validation'
import { previewYouTubeVideo } from '@/lib/youtube'

export async function POST(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  const limited = await rateLimit(request, {
    name: 'youtube-preview',
    windowMs: 60 * 1000,
    max: 30,
    message: 'Too many YouTube preview requests.',
  })
  if (limited) return limited

  try {
    const raw = await request.json()
    const parsed = validate(youtubePreviewSchema, raw)
    if (!parsed.success) return parsed.response

    const video = await previewYouTubeVideo(parsed.data.url, parsed.data.language)
    return NextResponse.json(video)
  } catch (error) {
    logger.error('[POST /api/admin/resources/youtube/preview]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
