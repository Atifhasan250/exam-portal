import webPush from 'web-push'

let configured = false

export function hasPushEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_CONTACT_EMAIL,
  )
}

export function getWebPushClient() {
  if (!hasPushEnv()) {
    throw new Error('Push notification environment variables are not configured.')
  }

  if (!configured) {
    const subject = process.env.VAPID_CONTACT_EMAIL.startsWith('mailto:')
      ? process.env.VAPID_CONTACT_EMAIL
      : `mailto:${process.env.VAPID_CONTACT_EMAIL}`

    webPush.setVapidDetails(
      subject,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    )
    configured = true
  }

  return webPush
}
