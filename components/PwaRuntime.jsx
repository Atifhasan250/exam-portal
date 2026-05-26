'use client'

import { useEffect } from 'react'

export default function PwaRuntime() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const canRegister =
      process.env.NODE_ENV === 'production' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'https:'
    if (!canRegister) return

    const registerServiceWorker = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
        console.error('Service worker registration failed', error)
      })
    }

    if (document.readyState === 'complete') {
      registerServiceWorker()
      return
    }

    window.addEventListener('load', registerServiceWorker, { once: true })
    return () => window.removeEventListener('load', registerServiceWorker)
  }, [])

  return null
}
