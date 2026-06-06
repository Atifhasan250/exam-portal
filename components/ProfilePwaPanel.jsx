'use client'

import { useEffect, useMemo, useState } from 'react'
import { isPushSupported, subscribeCurrentDeviceToPush } from '@/lib/pushClient'

export default function ProfilePwaPanel() {
  const [subscriptionState, setSubscriptionState] = useState({ subscribed: false, count: 0 })
  const [notificationPermission, setNotificationPermission] = useState('default')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
  const pushSupported = useMemo(() => isPushSupported(vapidPublicKey), [vapidPublicKey])

  useEffect(() => {
    if ('Notification' in window) setNotificationPermission(Notification.permission)
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/push/subscription').then((response) => response.json()).catch(() => null).then((subscriptionData) => {
      if (!active) return
      if (subscriptionData && !subscriptionData.error) {
        setSubscriptionState({
          subscribed: Boolean(subscriptionData.subscribed),
          count: subscriptionData.count || 0,
        })
      }
    })
    return () => { active = false }
  }, [])

  const enableNotifications = async () => {
    if (!pushSupported) {
      setMessage('Notifications need browser support and push configuration.')
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

      await subscribeCurrentDeviceToPush(vapidPublicKey)
      setSubscriptionState({ subscribed: true, count: 1 })
      setMessage('Notifications are on.')
    } catch (error) {
      setMessage(error.message || 'Could not enable notifications.')
    } finally {
      setBusy(false)
    }
  }

  const disableNotifications = async () => {
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
        body: JSON.stringify(endpoint ? { endpoint } : { all: true }),
      })

      setSubscriptionState({ subscribed: false, count: 0 })
      setMessage('Notifications are off.')
    } catch (error) {
      setMessage(error.message || 'Could not disable notifications.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bg-theme-surface border border-theme-border rounded-2xl p-6 mb-10 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-theme-primary flex items-center gap-2">
            <i className="fas fa-bell text-theme-accent" />
            Notifications
          </h3>
          <p className="text-theme-secondary text-sm mt-2 leading-relaxed">
            Enable browser notifications to get important IT Resource Zone updates on this device.
          </p>
          {message ? (
            <p className="mt-3 text-sm font-semibold text-theme-secondary">{message}</p>
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-3 md:w-56">
          {subscriptionState.subscribed ? (
            <button
              onClick={disableNotifications}
              disabled={busy}
              className="w-full px-4 py-3 rounded-xl font-bold bg-theme-bg text-theme-primary border border-theme-border hover:border-theme-accent disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2"
            >
              <i className="fas fa-bell-slash" />
              Turn Off Notifications
            </button>
          ) : (
            <button
              onClick={enableNotifications}
              disabled={busy || notificationPermission === 'denied'}
              className="w-full px-4 py-3 rounded-xl font-bold bg-theme-bg text-theme-primary border border-theme-border hover:border-theme-accent disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2"
            >
              <i className="fas fa-bell" />
              Enable Notifications
            </button>
          )}
          {notificationPermission === 'denied' ? (
            <div className="text-xs text-theme-secondary text-center">
              Notifications are blocked in your browser settings.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
