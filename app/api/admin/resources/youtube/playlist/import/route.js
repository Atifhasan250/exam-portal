import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { rateLimit } from '@/lib/rateLimit'
import { validate, youtubePlaylistImportSchema } from '@/lib/validation'
import { logAdminAction } from '@/lib/auditLog'
import Resource from '@/lib/models/Resource'
import ResourceCategory from '@/lib/models/ResourceCategory'
import { serialize } from '@/lib/resourceUtils'
import { normalizeResourcePayload } from '@/lib/resourcePayload'
import { invalidateResourceCaches } from '@/lib/publicCache'

export async function POST(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  const limited = await rateLimit(request, {
    name: 'youtube-playlist-import',
    windowMs: 5 * 60 * 1000,
    max: 10,
    message: 'Too many playlist imports.',
  })
  if (limited) return limited

  try {
    const raw = await request.json()
    const parsed = validate(youtubePlaylistImportSchema, raw)
    if (!parsed.success) return parsed.response

    await connectDB()
    const category = await ResourceCategory.exists({ _id: parsed.data.categoryId })
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    const uniqueVideos = []
    const seenPayloadIds = new Set()
    let skippedDuplicateInPayloadCount = 0

    for (const video of parsed.data.videos) {
      if (seenPayloadIds.has(video.youtubeId)) {
        skippedDuplicateInPayloadCount += 1
        continue
      }
      seenPayloadIds.add(video.youtubeId)
      uniqueVideos.push(video)
    }

    const youtubeIds = uniqueVideos.map((video) => video.youtubeId)
    const existing = await Resource.find(
      { categoryId: parsed.data.categoryId, youtubeId: { $in: youtubeIds } },
      { youtubeId: 1 },
    ).lean()
    const existingIds = new Set(existing.map((resource) => resource.youtubeId))
    const maxOrder = await Resource.findOne({ categoryId: parsed.data.categoryId }, { order: 1 }).sort({ order: -1 }).lean()
    let order = maxOrder?.order || 0

    const docs = uniqueVideos
      .filter((video) => !existingIds.has(video.youtubeId))
      .map((video) => normalizeResourcePayload({
        ...video,
        categoryId: parsed.data.categoryId,
        youtubePlaylistId: parsed.data.playlistId,
        order: ++order,
        metadataSource: 'youtube',
        createdBy: adminCheck.admin?.username || 'admin',
        updatedBy: adminCheck.admin?.username || 'admin',
      }))

    const inserted = docs.length ? await Resource.insertMany(docs, { ordered: false }) : []

    await logAdminAction(request, adminCheck.admin, 'IMPORT_RESOURCE_PLAYLIST', parsed.data.categoryId, {
      categoryId: parsed.data.categoryId,
      playlistId: parsed.data.playlistId,
      importedCount: inserted.length,
      skippedExistingCount: existingIds.size,
      skippedDuplicateInPayloadCount,
    })
    if (inserted.length) await invalidateResourceCaches()

    return NextResponse.json(serialize({
      importedCount: inserted.length,
      skippedExistingCount: existingIds.size,
      skippedDuplicateInPayloadCount,
      skippedDuplicateCount: existingIds.size + skippedDuplicateInPayloadCount,
      resources: inserted,
    }))
  } catch (error) {
    if (error?.name === 'MongoBulkWriteError' || error?.writeErrors) {
      return NextResponse.json(
        { error: 'Some playlist videos could not be imported because duplicates already exist.' },
        { status: 409 },
      )
    }
    logger.error('[POST /api/admin/resources/youtube/playlist/import]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
