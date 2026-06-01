'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const NOTIFICATION_PATHS = [
  { label: 'Tasks', value: '/tasks' },
  { label: 'Exams', value: '/exams' },
  { label: 'Profile', value: '/profile' },
  { label: 'Leaderboard', value: '/leaderboard' },
  { label: 'Dashboard', value: '/dashboard' },
  { label: 'Resources', value: '/resources' },
]

function getDefaultScheduledAt() {
  const scheduledDate = new Date(Date.now() + 10 * 60 * 1000)
  const timezoneOffset = scheduledDate.getTimezoneOffset() * 60 * 1000
  return new Date(scheduledDate.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

function createDefaultForm() {
  return {
    title: '',
    body: '',
    url: '/tasks',
    sendNow: true,
    scheduledAt: getDefaultScheduledAt(),
  }
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function AdminNotificationsPage() {
  const [form, setForm] = useState(createDefaultForm)
  const [notifications, setNotifications] = useState([])
  const [pushConfigured, setPushConfigured] = useState(true)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const canSubmit = useMemo(() => (
    form.title.trim() &&
    form.body.trim() &&
    form.url.trim().startsWith('/') &&
    (form.sendNow || form.scheduledAt)
  ), [form])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/notifications')
      if (response.status === 401) {
        router.push('/admin')
        return
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load notifications')
      setNotifications(data.notifications || [])
      setPushConfigured(Boolean(data.pushConfigured))
    } catch (loadError) {
      setError(loadError.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const updateSendNow = (sendNow) => {
    setForm((current) => ({
      ...current,
      sendNow,
      scheduledAt: sendNow ? current.scheduledAt : getDefaultScheduledAt(),
    }))
  }

  const sendNotification = async (event) => {
    event.preventDefault()
    setSending(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          url: form.url,
          scheduledAt: form.sendNow ? null : new Date(form.scheduledAt).toISOString(),
        }),
      })

      if (response.status === 401) {
        router.push('/admin')
        return
      }

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send notification')

      const notification = data.notification
      setNotifications((current) => [notification, ...current].slice(0, 30))
      setForm(createDefaultForm())
      setMessage(notification.status === 'sent'
        ? `Sent ${notification.sent} of ${notification.attempted} subscriptions.`
        : 'Notification scheduled.')
    } catch (sendError) {
      setError(sendError.message || 'Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme page-enter">
      <main className="max-w-5xl mx-auto px-4 py-10 sm:py-14 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-theme-primary mb-1">Notifications</h2>
            <p className="text-theme-secondary text-sm">Send app notifications to users who enabled notifications.</p>
          </div>
          <Link href="/admin/dashboard" className="px-4 py-3 text-sm font-bold bg-theme-surface text-theme-secondary border border-theme-border rounded-xl hover:text-theme-primary transition-all flex items-center justify-center">
            <i className="fas fa-arrow-left mr-2" />
            Dashboard
          </Link>
        </div>

        {!pushConfigured ? (
          <div className="bg-theme-error-bg border border-theme-error-border text-theme-error-text rounded-2xl p-4 text-sm font-semibold">
            Push environment variables are not configured.
          </div>
        ) : null}

        {message ? (
          <div className="bg-theme-success-bg border border-theme-success-border text-theme-success-text rounded-2xl p-4 text-sm font-semibold">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="bg-theme-error-bg border border-theme-error-border text-theme-error-text rounded-2xl p-4 text-sm font-semibold">
            {error}
          </div>
        ) : null}

        <form onSubmit={sendNotification} className="bg-theme-surface border border-theme-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-theme-secondary mb-2">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                maxLength={80}
                className="w-full px-4 py-3 rounded-xl bg-theme-bg border border-theme-border text-theme-primary outline-none focus:ring-2 focus:ring-theme-accent"
                placeholder="New exam is live"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-theme-secondary mb-2">Open Path</label>
              <select
                value={form.url}
                onChange={(event) => updateField('url', event.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-theme-bg border border-theme-border text-theme-primary outline-none focus:ring-2 focus:ring-theme-accent"
                required
              >
                {NOTIFICATION_PATHS.map((path) => (
                  <option key={path.value} value={path.value}>
                    {path.label} ({path.value})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-theme-secondary mb-2">Description</label>
            <textarea
              value={form.body}
              onChange={(event) => updateField('body', event.target.value)}
              maxLength={240}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-theme-bg border border-theme-border text-theme-primary outline-none focus:ring-2 focus:ring-theme-accent resize-none"
              placeholder="Tap to start the new practice set."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5 items-end">
            <div className="flex rounded-xl bg-theme-bg border border-theme-border p-1">
              <button
                type="button"
                onClick={() => updateSendNow(true)}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${form.sendNow ? 'bg-theme-accent text-theme-accent-text shadow-sm' : 'text-theme-secondary hover:text-theme-primary'}`}
              >
                Send Now
              </button>
              <button
                type="button"
                onClick={() => updateSendNow(false)}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${!form.sendNow ? 'bg-theme-accent text-theme-accent-text shadow-sm' : 'text-theme-secondary hover:text-theme-primary'}`}
              >
                Schedule
              </button>
            </div>

            {!form.sendNow ? (
              <div>
                <label className="block text-sm font-bold text-theme-secondary mb-2">Time</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(event) => updateField('scheduledAt', event.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-theme-bg border border-theme-border text-theme-primary outline-none focus:ring-2 focus:ring-theme-accent"
                  required={!form.sendNow}
                />
              </div>
            ) : (
              <div className="hidden md:block" />
            )}
          </div>

          <button
            type="submit"
            disabled={sending || !canSubmit || !pushConfigured}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold bg-theme-accent text-theme-accent-text hover:opacity-90 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            <i className="fas fa-paper-plane" />
            {sending ? 'Sending...' : form.sendNow ? 'Send Notification' : 'Schedule Notification'}
          </button>
        </form>

        <section className="bg-theme-surface border border-theme-border rounded-2xl p-6 sm:p-8 shadow-sm">
          <h3 className="text-xl font-bold text-theme-primary mb-5">Recent Notifications</h3>
          {loading ? (
            <p className="text-theme-secondary text-sm">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="text-theme-secondary text-sm">No notifications yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-theme-secondary border-b border-theme-border">
                  <tr>
                    <th className="py-3 pr-4 font-bold">Title</th>
                    <th className="py-3 pr-4 font-bold">Status</th>
                    <th className="py-3 pr-4 font-bold">Scheduled</th>
                    <th className="py-3 pr-4 font-bold">Sent</th>
                    <th className="py-3 pr-4 font-bold">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((notification) => (
                    <tr key={notification.id} className="border-b border-theme-border/70 last:border-0">
                      <td className="py-4 pr-4 font-semibold text-theme-primary min-w-48">{notification.title}</td>
                      <td className="py-4 pr-4 capitalize text-theme-secondary">{notification.status}</td>
                      <td className="py-4 pr-4 text-theme-secondary whitespace-nowrap">{formatDate(notification.scheduledAt)}</td>
                      <td className="py-4 pr-4 text-theme-secondary whitespace-nowrap">{formatDate(notification.sentAt)}</td>
                      <td className="py-4 pr-4 text-theme-secondary whitespace-nowrap">
                        {notification.sent}/{notification.attempted}
                        {notification.failed ? ` failed ${notification.failed}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
