import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { rateLimit } from '@/lib/rateLimit'
import { validate, youtubePlaylistPreviewSchema } from '@/lib/validation'
import { extractYouTubePlaylistId } from '@/lib/resourceUtils'
import { fetchYouTubePlaylistPage } from '@/lib/youtube'

export async function POST(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  const limited = await rateLimit(request, {
    name: 'youtube-playlist-preview',
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many playlist preview requests.',
  })
  if (limited) return limited

  try {
    const raw = await request.json()
    const parsed = validate(youtubePlaylistPreviewSchema, raw)
    if (!parsed.success) return parsed.response

    const playlistId = extractYouTubePlaylistId(parsed.data.url)
    const page = await fetchYouTubePlaylistPage(parsed.data.url, {
      limit: parsed.data.limit,
      pageToken: parsed.data.pageToken,
    })
    return NextResponse.json({ playlistId, ...page })
  } catch (error) {
    logger.error('[POST /api/admin/resources/youtube/playlist/preview]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
