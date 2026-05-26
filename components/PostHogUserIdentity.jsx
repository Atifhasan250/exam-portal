'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import posthog from 'posthog-js'

export default function PostHogUserIdentity() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded) return
    try {
      if (user) {
        if (typeof posthog?.identify === 'function') {
          posthog.identify(user.id)
        }
      } else {
        if (typeof posthog?.reset === 'function') {
          posthog.reset()
        }
      }
    } catch (err) {
      console.error('[PostHogUserIdentity] PostHog call failed', err)
    }
  }, [isLoaded, user?.id])

  return null
}
