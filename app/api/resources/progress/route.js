import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { validate, resourceProgressSchema } from '@/lib/validation'
import ResourceProgress from '@/lib/models/ResourceProgress'
import Resource from '@/lib/models/Resource'
import { serialize } from '@/lib/resourceUtils'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json([])

  try {
    await connectDB()
    const progress = await ResourceProgress.find({ clerkUserId: userId })
      .populate({
        path: 'resourceId',
        match: { published: true },
        populate: { path: 'categoryId', select: 'name slug icon color' },
      })
      .sort({ lastAccessedAt: -1 })
      .limit(200)
      .lean()

    return NextResponse.json(serialize(progress.filter((item) => item.resourceId)))
  } catch (error) {
    logger.error('[GET /api/resources/progress]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const raw = await request.json()
    const parsed = validate(resourceProgressSchema, raw)
    if (!parsed.success) return parsed.response

    await connectDB()
    const resource = await Resource.exists({ _id: parsed.data.resourceId, published: true })
    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    const progress = await ResourceProgress.findOneAndUpdate(
      { clerkUserId: userId, resourceId: parsed.data.resourceId },
      {
        $set: {
          progressSeconds: parsed.data.progressSeconds,
          completed: parsed.data.completed,
          lastAccessedAt: new Date(),
        },
      },
      { new: true, upsert: true, lean: true },
    )

    return NextResponse.json(serialize(progress))
  } catch (error) {
    logger.error('[POST /api/resources/progress]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
