'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import posthog from 'posthog-js'

export default function PostHogUserIdentity() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded) return
    if (user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username,
      })
    } else {
      posthog.reset()
    }
  }, [isLoaded, user?.id])

  return null
}
