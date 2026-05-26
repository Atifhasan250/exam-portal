import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getWebPushClient, hasPushEnv } from '@/lib/push'
import PushSubscription from '@/lib/models/PushSubscription'
import ReminderPreference from '@/lib/models/ReminderPreference'

export const runtime = 'nodejs'

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const authHeader = request.headers.get('authorization') || ''
  if (authHeader === `Bearer ${secret}`) return true

  return request.headers.get('x-cron-secret') === secret
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!hasPushEnv()) {
    return NextResponse.json({ error: 'Push environment variables are not configured.' }, { status: 503 })
  }

  try {
    await connectDB()
    const preferences = await ReminderPreference.find({
      enabled: true,
      reminderTime: '20:00',
      timezone: 'Asia/Dhaka',
    }).lean()

    const userIds = preferences.map((preference) => preference.clerkUserId)
    if (userIds.length === 0) {
      return NextResponse.json({ success: true, attempted: 0, sent: 0, failed: 0 })
    }

    const subscriptions = await PushSubscription.find({
      clerkUserId: { $in: userIds },
      active: true,
    }).lean()
    const webPush = getWebPushClient()
    const payload = JSON.stringify({
      title: 'IT Resource Zone',
      body: 'Keep your study streak moving. Check today\'s tasks and habits.',
      icon: '/icons/notification-192.png',
      badge: '/icons/badge-96.png',
      tag: 'daily-study-reminder',
      url: '/tasks',
    })

    let sent = 0
    let failed = 0
    await Promise.all(subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification({
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime ?? null,
          keys: subscription.keys,
        }, payload)
        sent += 1
        await PushSubscription.updateOne(
          { _id: subscription._id },
          { $set: { lastSentAt: new Date(), failedAt: null, active: true } },
        )
      } catch (error) {
        failed += 1
        const statusCode = error?.statusCode || error?.status
        const deactivate = statusCode === 404 || statusCode === 410
        await PushSubscription.updateOne(
          { _id: subscription._id },
          {
            $set: {
              failedAt: new Date(),
              ...(deactivate ? { active: false } : {}),
            },
          },
        )
      }
    }))

    return NextResponse.json({
      success: true,
      attempted: subscriptions.length,
      sent,
      failed,
    })
  } catch (error) {
    logger.error('[GET /api/cron/daily-reminders]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
