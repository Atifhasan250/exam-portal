import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { userMutationRateLimit } from '@/lib/rateLimit'
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

  const limited = await userMutationRateLimit(request, {
    name: 'push-subscription-create',
    max: 20,
    keyParts: [userId],
  })
  if (limited) return limited

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

  const limited = await userMutationRateLimit(request, {
    name: 'push-subscription-delete',
    max: 20,
    keyParts: [userId],
  })
  if (limited) return limited

  try {
    const deleteAllFromQuery = request.nextUrl.searchParams.get('all') === 'true'
    let body = {}
    const contentLength = request.headers.get('content-length')
    const hasBody = contentLength === null
      ? request.headers.has('content-type') || request.headers.has('transfer-encoding')
      : Number(contentLength) > 0

    if (hasBody) {
      try {
        body = await request.json()
      } catch {
        return NextResponse.json({ error: 'Malformed JSON body' }, { status: 400 })
      }
    }

    const deleteAll = deleteAllFromQuery || body?.all === true
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint.trim() : ''

    if (!deleteAll && !endpoint) {
      return NextResponse.json({ error: 'Endpoint is required unless all=true is set.' }, { status: 400 })
    }
    if (!deleteAll) {
      try {
        new URL(endpoint)
      } catch {
        return NextResponse.json({ error: 'Endpoint must be a valid URL.' }, { status: 400 })
      }
      if (endpoint.length > 2048) {
        return NextResponse.json({ error: 'Endpoint must be 2048 characters or fewer.' }, { status: 400 })
      }
    }

    await connectDB()
    const filter = deleteAll
      ? { clerkUserId: userId }
      : { clerkUserId: userId, endpoint }
    await PushSubscription.updateMany(filter, { $set: { active: false } })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[DELETE /api/push/subscription]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
