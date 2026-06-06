'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useClerk, useUser } from '@clerk/nextjs'
import PageSkeleton from '@/components/PageSkeleton'
import AuthCallout from '@/components/AuthCallout'
import ProfilePwaPanel from '@/components/ProfilePwaPanel'
import ThemeToggle from '@/components/ThemeToggle'
import { useTheme } from '@/context/ThemeContext'

const QUICK_LINKS = [
  { href: '/exams/history', label: 'Exam History', icon: 'fa-layer-group' },
  { href: '/dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
  { href: '/exams', label: 'Exams', icon: 'fa-pen-to-square' },
  { href: '/tasks/history', label: 'Tasks History', icon: 'fa-list-check' },
  { href: '/resources', label: 'Resources', icon: 'fa-book-open' },
  { href: '/leaderboard', label: 'Leaderboard', icon: 'fa-trophy' },
]

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const { theme, toggleTheme } = useTheme()
  const [summary, setSummary] = useState(null)
  const [recentSubmissions, setRecentSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!user) {
      setLoading(false)
      return
    }

    let active = true
    Promise.allSettled([
      fetch('/api/dashboard/summary').then((response) => response.ok ? response.json() : null),
      fetch(`/api/submissions/user/${encodeURIComponent(user.id)}?limit=5&offset=0`).then((response) => response.ok ? response.json() : null),
    ]).then(([summaryResult, submissionsResult]) => {
      if (!active) return
      if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value)
      if (submissionsResult.status === 'fulfilled') {
        const data = submissionsResult.value
        setRecentSubmissions(Array.isArray(data) ? data : data?.submissions || [])
      }
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [isLoaded, user])

  const joinedDate = useMemo(() => {
    const createdAt = user?.createdAt ? new Date(user.createdAt) : null
    return createdAt && Number.isFinite(createdAt.getTime())
      ? createdAt.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : 'Recently'
  }, [user?.createdAt])

  if (!isLoaded || loading) return <PageSkeleton />

  if (!user) {
    return (
      <div className="bg-theme-bg min-h-screen py-20 px-4">
        <div className="max-w-4xl mx-auto mt-10">
          <AuthCallout title="Login first to see your profile" description="Your account settings and learning activity are linked to your authenticated IT Resource Zone account." />
        </div>
      </div>
    )
  }

  const metrics = summary?.metrics || {}
  const email = user.primaryEmailAddress?.emailAddress || 'No primary email'
  const displayName = user.fullName || user.firstName || 'Student'
  const profileImageUrl = user.publicMetadata?.profileImageUrl || user.imageUrl || ''
  const profileCategory = getProfileCategory(user.publicMetadata)

  const handleChangePassword = async (event) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    setPasswordLoading(true)
    setPasswordError('')
    setPasswordSuccess('')
    try {
      await user.updatePassword({ currentPassword: oldPassword, newPassword })
      setPasswordSuccess('Password updated successfully.')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setPasswordError(error?.errors?.[0]?.message || 'Failed to update password. Social sign-in accounts may not have a password here.')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeletingAccount(true)
    try {
      const response = await fetch('/api/account', { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete account')
      try {
        await signOut?.({ redirectUrl: '/' })
      } catch (signOutError) {
        console.error('Failed to sign out after account deletion', signOutError)
      }
      router.replace('/')
    } catch (error) {
      console.error('Failed to delete account', error)
      setDeletingAccount(false)
    }
  }

  const exportProfileData = () => {
    const report = buildProfileReportHtml({
      name: displayName,
      email,
      joinedDate,
      metrics,
      summary,
      recentSubmissions,
    })
    const frame = document.createElement('iframe')
    frame.setAttribute('title', 'IT Resource Zone PDF export')
    frame.style.position = 'fixed'
    frame.style.right = '0'
    frame.style.bottom = '0'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    frame.style.opacity = '0'

    document.body.appendChild(frame)
    const frameWindow = frame.contentWindow
    const frameDocument = frame.contentDocument || frameWindow?.document
    if (!frameWindow || !frameDocument) {
      frame.remove()
      return
    }

    frame.onload = () => {
      frameWindow.focus()
      frameWindow.print()
      setTimeout(() => frame.remove(), 1000)
    }

    frameDocument.open()
    frameDocument.write(report)
    frameDocument.close()
  }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme pb-24 page-enter">
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Profile</h1>
        </header>

        <section className="relative bg-theme-surface border border-theme-border rounded-2xl p-6 sm:p-8">
          <div className="absolute right-4 top-4 z-10 sm:hidden">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 text-center sm:text-left">
            <div className="w-24 h-24 mx-auto sm:mx-0 rounded-full bg-theme-accent/10 border border-theme-accent/20 overflow-hidden flex items-center justify-center shrink-0">
              {profileImageUrl ? (
                <Image src={profileImageUrl} alt={displayName} width={96} height={96} className="w-full h-full object-cover" />
              ) : (
                <i className="fas fa-user text-4xl text-theme-accent" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h1 className="text-3xl font-black truncate">{displayName}</h1>
                <Link
                  href="/profile/edit"
                  className="w-9 h-9 rounded-xl bg-theme-bg border border-theme-border text-theme-secondary hover:text-theme-primary inline-flex items-center justify-center"
                  title="Edit profile"
                >
                  <i className="fas fa-pencil-alt text-xs" />
                </Link>
              </div>
              <p className="text-theme-secondary mt-1 break-all sm:break-normal">
                {email}
                <span className="hidden sm:inline"> | </span>
                <span className="block sm:inline break-normal">Joined {joinedDate}</span>
              </p>
              {profileCategory ? (
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                  <span className="px-3 py-1 rounded-full bg-theme-accent/10 text-theme-accent text-xs font-bold border border-theme-accent">
                    {profileCategory}
                  </span>
                </div>
              ) : null}
            </div>
            <button onClick={() => setShowLogoutDialog(true)} className="px-4 py-3 rounded-xl bg-theme-error-bg text-theme-error-text border border-theme-error-border font-bold text-sm inline-flex items-center justify-center gap-2">
              <i className="fas fa-sign-out-alt" />
              Logout
            </button>
          </div>
        </section>



        <section className="bg-theme-surface border border-theme-border rounded-2xl p-5">
          <h2 className="text-lg font-black mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {QUICK_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="min-h-[82px] bg-theme-bg border border-theme-border rounded-xl px-3 py-3 font-bold text-sm hover:border-theme-accent transition-colors flex flex-col sm:flex-row items-center justify-center gap-2 text-center leading-tight">
                <i className={`fas ${item.icon} text-theme-accent text-xl shrink-0`} />
                <span className="min-w-0">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <ProfilePwaPanel />

            <section className="bg-theme-surface border border-theme-border rounded-2xl p-6">
              <h2 className="text-lg font-black mb-4">Data</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={exportProfileData} className="px-4 py-3 rounded-xl bg-theme-bg border border-theme-border font-bold text-sm inline-flex items-center justify-center gap-2">
                  <i className="fas fa-file-pdf" />
                  Export My Data
                </button>
                <button onClick={() => setShowDeleteDialog(true)} className="px-4 py-3 rounded-xl bg-theme-error-bg text-theme-error-text border border-theme-error-border font-bold text-sm inline-flex items-center justify-center gap-2">
                  <i className="fas fa-user-times" />
                  Delete account
                </button>
              </div>
            </section>
          </div>

          <section className="bg-theme-surface border border-theme-border rounded-2xl p-6">
            <h2 className="text-lg font-black mb-4">Security</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError ? <div className="p-3 bg-theme-error-bg text-theme-error-text text-sm rounded-xl">{passwordError}</div> : null}
              {passwordSuccess ? <div className="p-3 bg-theme-success-bg text-theme-success-text text-sm rounded-xl">{passwordSuccess}</div> : null}
              <PasswordInput label="Current Password" value={oldPassword} onChange={setOldPassword} />
              <PasswordInput label="New Password" value={newPassword} onChange={setNewPassword} />
              <PasswordInput label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} />
              <button type="submit" disabled={passwordLoading} className="w-full sm:w-auto px-5 py-3 bg-theme-accent text-theme-accent-text rounded-xl font-bold disabled:opacity-60">
                {passwordLoading ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </section>
        </section>
      </main>

      {showLogoutDialog ? createPortal(
        <ConfirmModal
          icon="fa-sign-out-alt"
          title="Logout?"
          text="Are you sure you want to log out of your account?"
          confirmLabel="Logout"
          onCancel={() => setShowLogoutDialog(false)}
          onConfirm={async () => {
            setShowLogoutDialog(false)
            await signOut?.({ redirectUrl: '/' })
          }}
        />,
        document.body,
      ) : null}

      {showDeleteDialog ? createPortal(
        <ConfirmModal
          danger
          icon="fa-user-times"
          title="Delete Account?"
          text="This action is permanent. Your sign-in account, submissions, planner data, resource progress, attempts, and notifications will be deleted."
          confirmLabel={deletingAccount ? 'Deleting...' : 'Delete'}
          disabled={deletingAccount}
          onCancel={() => !deletingAccount && setShowDeleteDialog(false)}
          onConfirm={handleDeleteAccount}
        />,
        document.body,
      ) : null}
    </div>
  )
}

function buildProfileReportHtml({ name, email, joinedDate, metrics, summary, recentSubmissions }) {
  const exportedAt = new Date().toLocaleString()
  const totalExams = (metrics.liveCompleted || 0) + (metrics.practiceCompleted || 0)
  const resources = summary?.resources || []
  const recommendation = summary?.recommendation || 'Keep studying consistently and review your recent exam results.'

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>IT Resource Zone Learning Report</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, Arial, sans-serif;
      color: #081126;
      background: #fff9e3;
    }
    .page {
      background: #fff8e7;
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 18px;
      padding: 28px;
    }
    .brand {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 18px;
      border-bottom: 2px solid rgba(234,122,83,0.25);
      padding-bottom: 18px;
      margin-bottom: 22px;
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 30px; line-height: 1.1; font-weight: 900; }
    h2 { font-size: 18px; margin-bottom: 12px; font-weight: 900; }
    .muted { color: rgba(8,17,38,0.62); }
    .pill {
      background: #ea7a53;
      color: #fff;
      border-radius: 999px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 22px;
    }
    .card {
      background: #fff9e3;
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 14px;
      padding: 16px;
      break-inside: avoid;
    }
    .metric {
      font-size: 26px;
      font-weight: 900;
      color: #ea7a53;
      margin-bottom: 4px;
    }
    .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .08em;
      font-weight: 800;
      color: rgba(8,17,38,0.62);
    }
    .two-col {
      display: grid;
      grid-template-columns: 1.15fr .85fr;
      gap: 14px;
      margin-bottom: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      text-align: left;
      color: rgba(8,17,38,0.62);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .08em;
      padding: 8px 0;
      border-bottom: 1px solid rgba(0,0,0,0.1);
    }
    td {
      padding: 10px 0;
      border-bottom: 1px solid rgba(0,0,0,0.08);
      vertical-align: top;
    }
    .score { color: #ea7a53; font-weight: 900; text-align: right; }
    .progress {
      height: 8px;
      background: #eadfbd;
      border-radius: 99px;
      overflow: hidden;
      margin-top: 8px;
    }
    .bar { height: 100%; background: #ea7a53; border-radius: 99px; }
    .note {
      background: rgba(234,122,83,0.1);
      border: 1px solid rgba(234,122,83,0.25);
      border-radius: 14px;
      padding: 16px;
      font-size: 13px;
      line-height: 1.5;
    }
    .footer {
      margin-top: 22px;
      padding-top: 14px;
      border-top: 1px solid rgba(0,0,0,0.1);
      font-size: 11px;
      color: rgba(8,17,38,0.55);
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    @media print {
      body { background: #fff; }
      .page { border-color: rgba(0,0,0,0.14); }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="brand">
      <div>
        <h1>${escapeReportHtml(name)}'s Learning Report</h1>
        <p class="muted">${escapeReportHtml(email)}</p>
        <p class="muted">Joined ${escapeReportHtml(joinedDate)}</p>
      </div>
      <div class="pill">IT Resource Zone</div>
    </section>

    <section class="grid">
      ${metricCard('Avg Score', `${metrics.averageScore || 0}%`)}
      ${metricCard('Best Score', `${metrics.bestScore || 0}%`)}
      ${metricCard('Exams', totalExams)}
      ${metricCard('Streak', `${metrics.currentStreak || 0}d`)}
    </section>

    <section class="two-col">
      <div class="card">
        <h2>Recent Exam Results</h2>
        ${examTable(recentSubmissions)}
      </div>
      <div class="card">
        <h2>Resource Progress</h2>
        ${resourceList(resources)}
      </div>
    </section>

    <section class="card">
      <h2>Learning Summary</h2>
      <div class="grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 0;">
        ${metricCard('Live Exams', metrics.liveCompleted || 0)}
        ${metricCard('Practice Exams', metrics.practiceCompleted || 0)}
        ${metricCard('Resources', `${metrics.resourcesCompleted || 0}/${metrics.resourcesStarted || 0}`)}
      </div>
    </section>

    <section class="note" style="margin-top: 14px;">
      <strong>Recommendation:</strong> ${escapeReportHtml(recommendation)}
    </section>

    <footer class="footer">
      <span>Exported ${escapeReportHtml(exportedAt)}</span>
      <span>Generated from your IT Resource Zone profile</span>
    </footer>
  </main>
</body>
</html>`
}

function metricCard(label, value) {
  return `<div class="card"><div class="metric">${escapeReportHtml(String(value))}</div><div class="label">${escapeReportHtml(label)}</div></div>`
}

function examTable(submissions) {
  if (!submissions.length) return '<p class="muted">No exam results yet.</p>'

  const rows = submissions.map((submission) => {
    const total = Number(submission.total) || 0
    const score = Number(submission.score) || 0
    const percent = total ? Math.round((score / total) * 100) : 0
    const title = submission.examId?.title || 'Deleted exam'
    const type = submission.wasLive ? 'Live' : 'Practice'
    const date = submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : ''

    return `<tr><td><strong>${escapeReportHtml(title)}</strong><br><span class="muted">${type} - ${escapeReportHtml(date)}</span></td><td class="score">${percent}%</td></tr>`
  }).join('')

  return `<table><thead><tr><th>Exam</th><th style="text-align:right;">Score</th></tr></thead><tbody>${rows}</tbody></table>`
}

function resourceList(resources) {
  if (!resources.length) return '<p class="muted">No resources started yet.</p>'

  return resources.map((resource) => `
    <div style="margin-bottom: 14px;">
      <strong>${escapeReportHtml(resource.title)}</strong>
      <div class="progress"><div class="bar" style="width: ${Math.max(0, Math.min(100, resource.percent || 0))}%"></div></div>
      <p class="muted" style="font-size: 11px; margin-top: 5px;">${resource.percent || 0}% complete</p>
    </div>
  `).join('')
}

function escapeReportHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function PasswordInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="block text-sm font-bold text-theme-secondary mb-1.5">{label}</span>
      <input type="password" value={value} onChange={(event) => onChange(event.target.value)} required className="input-field" />
    </label>
  )
}

function getProfileCategory(metadata = {}) {
  if (typeof metadata.category === 'string' && metadata.category.trim()) return metadata.category.trim()
  return Array.isArray(metadata.categories) ? String(metadata.categories[0] || '').trim() : ''
}

function ConfirmModal({ icon, title, text, confirmLabel, onCancel, onConfirm, danger = false, disabled = false }) {
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm modal-backdrop" onClick={onCancel} />
      <div className="relative bg-theme-surfaceElevated border border-theme-border rounded-2xl p-8 max-w-sm w-full shadow-2xl modal-panel text-theme-primary">
        <div className={`w-16 h-16 rounded-full border ${danger ? 'bg-theme-error-bg text-theme-error-text border-theme-error-border' : 'bg-theme-bg text-theme-primary border-theme-border'} flex items-center justify-center mx-auto mb-6 shadow-sm`}>
          <i className={`fas ${icon} text-3xl`} />
        </div>
        <h3 className="text-2xl font-black text-center mb-2">{title}</h3>
        <p className="text-theme-secondary text-center mb-8">{text}</p>
        <div className="flex gap-4">
          <button onClick={onCancel} disabled={disabled} className="flex-1 px-4 py-3 rounded-xl font-bold bg-theme-bg border border-theme-border text-theme-primary shadow-sm disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={disabled} className={`flex-1 px-4 py-3 rounded-xl font-bold shadow-md disabled:opacity-50 ${danger ? 'bg-red-600 text-white' : 'bg-theme-accent text-theme-accent-text'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
