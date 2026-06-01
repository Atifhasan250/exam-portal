import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { adminMutationRateLimit } from '@/lib/rateLimit'
import { logAdminAction } from '@/lib/auditLog'
import { logger } from '@/lib/logger'
import { hasPushEnv } from '@/lib/push'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { validate, adminNotificationSchema } from '@/lib/validation'
import { sendAdminNotificationToEnabledUsers } from '@/lib/adminNotifications'
import AdminNotification from '@/lib/models/AdminNotification'

export const runtime = 'nodejs'

function serializeNotification(notification) {
  return {
    id: String(notification._id),
    title: notification.title,
    body: notification.body,
    url: notification.url,
    scheduledAt: notification.scheduledAt,
    status: notification.status,
    sentAt: notification.sentAt,
    eligibleUsers: notification.eligibleUsers,
    attempted: notification.attempted,
    sent: notification.sent,
    failed: notification.failed,
    lastError: notification.lastError,
    failureDetails: notification.failureDetails || [],
    createdAt: notification.createdAt,
  }
}

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    await connectDB()
    const notifications = await AdminNotification.find({})
      .sort({ createdAt: -1 })
      .limit(30)
      .lean()

    return NextResponse.json({
      pushConfigured: hasPushEnv(),
      notifications: notifications.map(serializeNotification),
    })
  } catch (error) {
    logger.error('[GET /api/admin/notifications]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  const limited = await adminMutationRateLimit(request, {
    name: 'admin-notification-create',
    max: 10,
    keyParts: [adminCheck.admin?.username || 'admin'],
  })
  if (limited) return limited

  if (!hasPushEnv()) {
    return NextResponse.json({ error: 'Push environment variables are not configured.' }, { status: 503 })
  }

  try {
    const raw = await request.json()
    const parsed = validate(adminNotificationSchema, raw)
    if (!parsed.success) return parsed.response

    await connectDB()
    const now = new Date()
    const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : now
    const notification = await AdminNotification.create({
      ...parsed.data,
      scheduledAt,
      status: scheduledAt <= now ? 'pending' : 'pending',
      createdBy: adminCheck.admin?.username || 'admin',
    })

    let result = null
    if (scheduledAt <= now) {
      result = await sendAdminNotificationToEnabledUsers(notification)
      notification.set({
        ...result,
        status: 'sent',
        sentAt: new Date(),
        lastError: result.failed ? result.lastError : '',
      })
      await notification.save()
    }

    await logAdminAction(request, adminCheck.admin, 'SEND_ADMIN_NOTIFICATION', notification._id, {
      title: notification.title,
      scheduledAt: notification.scheduledAt,
      sent: result?.sent ?? 0,
    })

    return NextResponse.json({
      success: true,
      notification: serializeNotification(notification.toObject()),
    })
  } catch (error) {
    logger.error('[POST /api/admin/notifications]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
