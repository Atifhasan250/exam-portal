import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { userMutationRateLimit } from '@/lib/rateLimit'
import { validate, resourceProgressSchema } from '@/lib/validation'
import ResourceProgress from '@/lib/models/ResourceProgress'
import Resource from '@/lib/models/Resource'
import { serialize } from '@/lib/resourceUtils'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })

  try {
    await connectDB()
    const progress = await ResourceProgress.find({ clerkUserId: userId })
      .populate({
        path: 'resourceId',
        match: { published: true },
        select: '_id categoryId type title slug thumbnailUrl imagekitUrl fileName mimeType size youtubeId channelTitle durationSeconds level language tags topicTags order featured createdAt updatedAt',
        populate: { path: 'categoryId', select: 'name slug icon color' },
      })
      .sort({ lastAccessedAt: -1 })
      .lean()

    return NextResponse.json(serialize(progress.filter((item) => item.resourceId)), { headers: noStoreHeaders })
  } catch (error) {
    logger.error('[GET /api/resources/progress]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500, headers: noStoreHeaders })
  }
}

export async function POST(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })

  const limited = await userMutationRateLimit(request, {
    name: 'resource-progress-update',
    max: 60,
    keyParts: [userId],
  })
  if (limited) return limited

  try {
    const raw = await request.json()
    const parsed = validate(resourceProgressSchema, raw)
    if (!parsed.success) return parsed.response

    await connectDB()
    const resource = await Resource.exists({ _id: parsed.data.resourceId, published: true })
    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404, headers: noStoreHeaders })
    }

    const update = {
      $max: {
        progressSeconds: parsed.data.progressSeconds,
      },
      $set: {
        lastAccessedAt: new Date(),
      },
      $setOnInsert: {
        clerkUserId: userId,
        resourceId: parsed.data.resourceId,
      },
    }
    if (parsed.data.completed) update.$set.completed = true
    else update.$setOnInsert.completed = false

    const progress = await ResourceProgress.findOneAndUpdate(
      { clerkUserId: userId, resourceId: parsed.data.resourceId },
      update,
      { new: true, upsert: true, lean: true, setDefaultsOnInsert: true },
    )

    return NextResponse.json(serialize(progress), { headers: noStoreHeaders })
  } catch (error) {
    logger.error('[POST /api/resources/progress]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500, headers: noStoreHeaders })
  }
}
