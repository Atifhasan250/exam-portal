'use client'

import { useState } from 'react'

export default function ResourceOpenButton({
  resourceId,
  href,
  label = 'Open resource',
  pendingLabel = 'Opening...',
  icon = 'fa-arrow-up-right-from-square',
  variant = 'primary',
  download = false,
  newTab = true,
}) {
  const [saving, setSaving] = useState(false)
  const className = variant === 'secondary'
    ? 'inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-theme-border bg-theme-bg px-5 text-sm font-bold text-theme-primary transition-all hover:border-theme-accent hover:text-theme-accent'
    : 'inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-theme-accent px-5 text-sm font-bold text-white shadow-lg shadow-theme-accent/25 transition-all hover:brightness-110'

  const markComplete = async () => {
    if (!resourceId) return

    setSaving(true)
    try {
      await fetch('/api/resources/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId, progressSeconds: 1, completed: true }),
      })
    } catch {
      // Opening the resource should not be blocked if progress sync fails.
    } finally {
      setSaving(false)
    }
  }

  return (
    <a
      href={href}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noreferrer' : undefined}
      download={download || undefined}
      onClick={markComplete}
      className={className}
    >
      <i className={`fas ${icon} text-xs`} />
      <span>{saving ? pendingLabel : label}</span>
    </a>
  )
}
