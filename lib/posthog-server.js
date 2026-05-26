import { PostHog } from 'posthog-node'

let posthogClient = null

export function getPostHogClient() {
  if (!posthogClient) {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
    if (!token || !host) {
      throw new Error(
        'Missing required PostHog env vars: NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN and NEXT_PUBLIC_POSTHOG_HOST must be set.',
      )
    }
    posthogClient = new PostHog(token, {
      host,
      flushAt: 20,
      flushInterval: 10000,
    })
  }
  return posthogClient
}
