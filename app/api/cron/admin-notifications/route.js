import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import { hasPushEnv } from '@/lib/push'
import { sendAdminNotificationToEnabledUsers } from '@/lib/adminNotifications'
import AdminNotification from '@/lib/models/AdminNotification'

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
    const dueNotifications = await AdminNotification.find({
      status: 'pending',
      scheduledAt: { $lte: new Date() },
    })
      .sort({ scheduledAt: 1 })
      .limit(10)

    let sent = 0
    let failed = 0

    for (const notification of dueNotifications) {
      try {
        const result = await sendAdminNotificationToEnabledUsers(notification)
        notification.set({
          ...result,
          status: 'sent',
          sentAt: new Date(),
          lastError: '',
        })
        await notification.save()
        sent += 1
      } catch (error) {
        failed += 1
        notification.set({
          status: 'failed',
          lastError: logger.safeErrorMessage(error),
        })
        await notification.save()
      }
    }

    return NextResponse.json({
      success: true,
      processed: dueNotifications.length,
      sent,
      failed,
    })
  } catch (error) {
    logger.error('[GET /api/cron/admin-notifications]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
