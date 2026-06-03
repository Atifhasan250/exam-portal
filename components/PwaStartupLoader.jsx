'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useUser } from '@clerk/nextjs'

const MIN_VISIBLE_MS = 900

export default function PwaStartupLoader() {
  const { isLoaded } = useUser()
  const [shouldShow, setShouldShow] = useState(false)
  const [minimumElapsed, setMinimumElapsed] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const isAppLaunch = params.get('app') === '1'
    const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone

    if (!isAppLaunch && !isStandalone) return undefined

    setShouldShow(true)
    const timer = window.setTimeout(() => setMinimumElapsed(true), MIN_VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!shouldShow || !isLoaded || !minimumElapsed) return
    setShouldShow(false)
  }, [isLoaded, minimumElapsed, shouldShow])

  if (!shouldShow) return null

  return (
    <div
      aria-busy="true"
      aria-label="Loading app"
      className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-theme-bg text-theme-primary transition-theme"
      role="status"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-theme-border bg-theme-surface shadow-2xl shadow-theme-accent/10">
          <Image
            src="/icons/icon-512.png"
            alt="IT Resource Zone"
            width={84}
            height={84}
            priority
            className="rounded-2xl"
          />
        </div>
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-theme-border border-t-theme-accent" />
      </div>
    </div>
  )
}
