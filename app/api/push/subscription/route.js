import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { validate, pushSubscriptionSchema } from '@/lib/validation'
import PushSubscription from '@/lib/models/PushSubscription'

export const runtime = 'nodejs'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ subscribed: false, count: 0 })

  try {
    await connectDB()
    const count = await PushSubscription.countDocuments({ clerkUserId: userId, active: true })
    return NextResponse.json({ subscribed: count > 0, count })
  } catch (error) {
    logger.error('[GET /api/push/subscription]', { error })
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
    const parsed = validate(pushSubscriptionSchema, raw)
    if (!parsed.success) return parsed.response

    await connectDB()
    await PushSubscription.findOneAndUpdate(
      { endpoint: parsed.data.endpoint },
      {
        $set: {
          clerkUserId: userId,
          endpoint: parsed.data.endpoint,
          expirationTime: parsed.data.expirationTime ?? null,
          keys: parsed.data.keys,
          userAgent: request.headers.get('user-agent') || '',
          active: true,
          failedAt: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[POST /api/push/subscription]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    let endpoint = ''
    try {
      const body = await request.json()
      endpoint = typeof body?.endpoint === 'string' ? body.endpoint : ''
    } catch {
      endpoint = ''
    }

    await connectDB()
    const filter = endpoint
      ? { clerkUserId: userId, endpoint }
      : { clerkUserId: userId }
    await PushSubscription.updateMany(filter, { $set: { active: false } })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[DELETE /api/push/subscription]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
