import { getWebPushClient } from '@/lib/push'
import PushSubscription from '@/lib/models/PushSubscription'
import ReminderPreference from '@/lib/models/ReminderPreference'

export function buildAdminNotificationPayload(notification) {
  return JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: '/icons/notification-192.png',
    badge: '/icons/badge-96.png',
    tag: `admin-notification-${notification._id || Date.now()}`,
    url: notification.url || '/tasks',
  })
}

export async function sendAdminNotificationToEnabledUsers(notification) {
  const preferences = await ReminderPreference.find({ enabled: true })
    .select('clerkUserId')
    .lean()

  const userIds = preferences.map((preference) => preference.clerkUserId)
  if (userIds.length === 0) {
    return { eligibleUsers: 0, attempted: 0, sent: 0, failed: 0 }
  }

  const subscriptions = await PushSubscription.find({
    clerkUserId: { $in: userIds },
    active: true,
  }).lean()

  if (subscriptions.length === 0) {
    return { eligibleUsers: userIds.length, attempted: 0, sent: 0, failed: 0 }
  }

  const webPush = getWebPushClient()
  const payload = buildAdminNotificationPayload(notification)

  const results = await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webPush.sendNotification({
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: subscription.keys,
      }, payload)

      await PushSubscription.updateOne(
        { _id: subscription._id },
        { $set: { lastSentAt: new Date(), failedAt: null, active: true } },
      )

      return { sent: true }
    } catch (error) {
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

      return { sent: false }
    }
  }))

  const sent = results.filter((result) => result.sent).length

  return {
    eligibleUsers: userIds.length,
    attempted: subscriptions.length,
    sent,
    failed: subscriptions.length - sent,
  }
}
