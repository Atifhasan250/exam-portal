'use client'

import { useEffect, useMemo, useState } from 'react'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

function isIosSafari() {
  if (typeof navigator === 'undefined') return false
  const userAgent = navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent) && /safari/.test(userAgent) && !/crios|fxios|edgios/.test(userAgent)
}

export default function ProfilePwaPanel() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [subscriptionState, setSubscriptionState] = useState({ subscribed: false, count: 0 })
  const [preference, setPreference] = useState({
    enabled: false,
    reminderTime: '20:00',
    timezone: 'Asia/Dhaka',
  })
  const [notificationPermission, setNotificationPermission] = useState('default')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
  const pushSupported = useMemo(() => (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(vapidPublicKey)
  ), [vapidPublicKey])

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    setIsStandalone(Boolean(standalone))
    if ('Notification' in window) setNotificationPermission(Notification.permission)

    const handleInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/api/push/subscription').then((response) => response.json()).catch(() => null),
      fetch('/api/push/reminder-preferences').then((response) => response.json()).catch(() => null),
    ]).then(([subscriptionData, preferenceData]) => {
      if (!active) return
      if (subscriptionData && !subscriptionData.error) {
        setSubscriptionState({
          subscribed: Boolean(subscriptionData.subscribed),
          count: subscriptionData.count || 0,
        })
      }
      if (preferenceData && !preferenceData.error) {
        setPreference({
          enabled: Boolean(preferenceData.enabled),
          reminderTime: preferenceData.reminderTime || '20:00',
          timezone: preferenceData.timezone || 'Asia/Dhaka',
        })
      }
    })
    return () => { active = false }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const enableReminders = async () => {
    if (!pushSupported) {
      setMessage('Push reminders need a configured VAPID public key and browser support.')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission !== 'granted') {
        setMessage('Notification permission was not granted.')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      const subscribeResponse = await fetch('/api/push/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })
      if (!subscribeResponse.ok) throw new Error('Failed to save push subscription')

      const nextPreference = {
        enabled: true,
        reminderTime: '20:00',
        timezone: 'Asia/Dhaka',
      }
      const preferenceResponse = await fetch('/api/push/reminder-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextPreference),
      })
      if (!preferenceResponse.ok) throw new Error('Failed to save reminder preference')

      setSubscriptionState({ subscribed: true, count: 1 })
      setPreference(nextPreference)
      setMessage('Daily reminders are on.')
    } catch (error) {
      setMessage(error.message || 'Could not enable reminders.')
    } finally {
      setBusy(false)
    }
  }

  const disableReminders = async () => {
    setBusy(true)
    setMessage('')
    try {
      let endpoint = ''
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready.catch(() => null)
        const subscription = await registration?.pushManager?.getSubscription()
        endpoint = subscription?.endpoint || ''
        await subscription?.unsubscribe()
      }

      await fetch('/api/push/subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      })

      const nextPreference = {
        ...preference,
        enabled: false,
      }
      const preferenceResponse = await fetch('/api/push/reminder-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextPreference),
      })
      if (!preferenceResponse.ok) throw new Error('Failed to update reminder preference')

      setSubscriptionState({ subscribed: false, count: 0 })
      setPreference(nextPreference)
      setMessage('Daily reminders are off.')
    } catch (error) {
      setMessage(error.message || 'Could not disable reminders.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bg-theme-surface border border-theme-border rounded-2xl p-6 mb-10 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-theme-primary flex items-center gap-2">
            <i className="fas fa-mobile-screen-button text-theme-accent" />
            Mobile App
          </h3>
          <p className="text-theme-secondary text-sm mt-2 leading-relaxed">
            Install IT Resource Zone on your phone and use daily task reminders at 8 PM.
          </p>
          {message ? (
            <p className="mt-3 text-sm font-semibold text-theme-secondary">{message}</p>
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-3 md:w-56">
          {installPrompt && !isStandalone ? (
            <button
              onClick={handleInstall}
              className="w-full px-4 py-3 rounded-xl font-bold bg-theme-accent text-theme-accent-text hover:opacity-90 transition-all inline-flex items-center justify-center gap-2"
            >
              <i className="fas fa-download" />
              Install App
            </button>
          ) : (
            <div className="w-full px-4 py-3 rounded-xl bg-theme-bg border border-theme-border text-sm font-bold text-theme-secondary text-center">
              {isStandalone ? 'Installed mode active' : isIosSafari() ? 'Use Share > Add to Home Screen' : 'Install prompt appears when available'}
            </div>
          )}

          {preference.enabled && subscriptionState.subscribed ? (
            <button
              onClick={disableReminders}
              disabled={busy}
              className="w-full px-4 py-3 rounded-xl font-bold bg-theme-bg text-theme-primary border border-theme-border hover:border-theme-accent disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2"
            >
              <i className="fas fa-bell-slash" />
              Turn Off
            </button>
          ) : (
            <button
              onClick={enableReminders}
              disabled={busy || notificationPermission === 'denied'}
              className="w-full px-4 py-3 rounded-xl font-bold bg-theme-bg text-theme-primary border border-theme-border hover:border-theme-accent disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2"
            >
              <i className="fas fa-bell" />
              Remind Me
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
