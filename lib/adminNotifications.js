import { sendPushPayloadToActiveSubscriptions } from '@/lib/pushDelivery'

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
  return sendPushPayloadToActiveSubscriptions(buildAdminNotificationPayload(notification))
}
