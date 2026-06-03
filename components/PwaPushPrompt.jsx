'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { isPushSupported, isStandaloneApp, subscribeCurrentDeviceToPush } from '@/lib/pushClient'

const PROMPT_ATTEMPT_KEY = 'irz_push_auto_prompt_attempted'
const TOAST_DURATION_MS = 6000

export default function PwaPushPrompt() {
  const { user, isLoaded } = useUser()
  const [toastVisible, setToastVisible] = useState(false)
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

  useEffect(() => {
    if (!isLoaded || !user) return undefined
    if (!isPushSupported(vapidPublicKey)) return undefined
    if (!isStandaloneApp()) return undefined
    if (Notification.permission !== 'default') return undefined
    const promptAttemptKey = `${PROMPT_ATTEMPT_KEY}:${user.id}`
    if (window.localStorage.getItem(promptAttemptKey) === '1') return undefined

    let cancelled = false
    const timer = window.setTimeout(async () => {
      if (cancelled) return
      window.localStorage.setItem(promptAttemptKey, '1')

      try {
        const permission = await Notification.requestPermission()
        if (cancelled) return

        if (permission !== 'granted') {
          setToastVisible(true)
          return
        }

        await subscribeCurrentDeviceToPush(vapidPublicKey)
      } catch {
        if (!cancelled) setToastVisible(true)
      }
    }, 1200)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [isLoaded, user, vapidPublicKey])

  useEffect(() => {
    if (!toastVisible) return undefined
    const timer = window.setTimeout(() => setToastVisible(false), TOAST_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [toastVisible])

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-[2147482500] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 transition-all duration-300 sm:bottom-6 ${
        toastVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-2xl border border-theme-border bg-theme-surface p-4 text-theme-primary shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-theme-accent/10 text-theme-accent">
            <i className="fas fa-bell text-sm" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">Notifications off</p>
            <p className="mt-1 text-xs leading-relaxed text-theme-secondary">
              Profile page থেকে চাইলে notifications enable করতে পারবেন।
            </p>
            <Link href="/profile" className="mt-3 inline-flex text-xs font-bold text-theme-accent">
              Open Profile
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setToastVisible(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-theme-secondary hover:bg-theme-bg hover:text-theme-primary"
            aria-label="Dismiss notification reminder"
          >
            <i className="fas fa-xmark text-sm" />
          </button>
        </div>
      </div>
    </div>
  )
}
