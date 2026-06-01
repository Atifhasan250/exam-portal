import { getWebPushClient } from '@/lib/push'
import PushSubscription from '@/lib/models/PushSubscription'

export async function sendPushPayloadToActiveSubscriptions(payload) {
  const subscriptions = await PushSubscription.find({ active: true }).lean()

  if (subscriptions.length === 0) {
    return { eligibleUsers: 0, attempted: 0, sent: 0, failed: 0 }
  }

  const uniqueUsers = new Set(subscriptions.map((subscription) => subscription.clerkUserId))
  const webPush = getWebPushClient()
  const serializedPayload = typeof payload === 'string' ? payload : JSON.stringify(payload)

  const results = await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webPush.sendNotification({
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: subscription.keys,
      }, serializedPayload)

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
    eligibleUsers: uniqueUsers.size,
    attempted: subscriptions.length,
    sent,
    failed: subscriptions.length - sent,
  }
}
