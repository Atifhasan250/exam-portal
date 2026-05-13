'use client'

import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useClerk, useUser } from '@clerk/nextjs'
import PageSkeleton from '@/components/PageSkeleton'
import AuthCallout from '@/components/AuthCallout'
import { getPlannerData } from '@/app/tasks/actions'

export default function ProfilePage() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [plannerData, setPlannerData] = useState(null)
  const [tasksLoading, setTasksLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  const router = useRouter()
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const { user, isLoaded } = hasClerk ? useUser() : { user: null, isLoaded: true }
  const { signOut } = hasClerk ? useClerk() : { signOut: null }

  useEffect(() => {
    if (!user) return

    fetch(`/api/submissions/user/${encodeURIComponent(user.id)}`)
      .then((response) => response.json())
      .then((data) => {
        setSubmissions(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))

    getPlannerData()
      .then(data => {
        setPlannerData(data)
        setTasksLoading(false)
      })
      .catch(() => setTasksLoading(false))
  }, [user])

  const taskSummary = useMemo(() => {
    if (!plannerData) return null

    let totalCompletedTasks = 0
    let totalTasks = 0
    plannerData.weeks?.forEach(w => {
      w.tasks?.forEach(t => {
        totalTasks++
        if (t.completed) totalCompletedTasks++
      })
    })

    let totalHabitsCompleted = 0
    if (plannerData.habitHistory) {
      Object.values(plannerData.habitHistory).forEach(day => {
        totalHabitsCompleted += Object.values(day).filter(Boolean).length
      })
    }

    return { totalCompletedTasks, totalTasks, totalHabitsCompleted }
  }, [plannerData])

  // Auto-open name modal for new users who have no name set
  useEffect(() => {
    if (!user || !isLoaded) return
    const hasName = user.fullName || user.firstName
    if (!hasName) {
      setNameInput('')
      setShowEditModal(true)
    }
  }, [user?.id, isLoaded])

  if (!isLoaded) return <PageSkeleton />
  if (hasClerk && !user) {
    return (
      <div className="bg-theme-bg min-h-screen py-20 px-4">
        <div className="max-w-4xl mx-auto px-4 mt-10">
          <AuthCallout title="Login first to see your profile" description="Your exam history is linked to your authenticated IT Resource Zone account." />
        </div>
      </div>
    )
  }

  const saveNewName = async () => {
    const trimmed = nameInput.trim()
    if (!trimmed || !user) return

    const parts = trimmed.split(/\s+/)
    const firstName = parts.shift() || ''
    const lastName = parts.join(' ')

    setSavingName(true)
    setNameError('')
    try {
      await user.update({ firstName, lastName })
      setShowEditModal(false)
    } catch (error) {
      setNameError(error?.errors?.[0]?.message || 'Failed to update your name.')
    } finally {
      setSavingName(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    setPasswordLoading(true)
    setPasswordError('')
    setPasswordSuccess('')
    try {
      await user.updatePassword({
        currentPassword: oldPassword,
        newPassword: newPassword,
      })
      setPasswordSuccess('Password updated successfully!')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setPasswordError(error?.errors?.[0]?.message || 'Failed to update password. If you signed in with Google, you cannot set a password here.')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    setDeletingAccount(true)
    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account')
      }
      router.push('/')
    } catch (err) {
      console.error('Failed to delete account', err)
      setDeletingAccount(false)
    }
  }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme pb-20 page-enter">

      <main className="max-w-4xl mx-auto px-4 mt-8">
        <div className="flex items-center space-x-3 mb-6">
          <Link href="/" className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all">
            <i className="fas fa-arrow-left" />
          </Link>
          <h2 className="text-3xl font-extrabold text-theme-primary">Your Profile</h2>
        </div>
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 mb-8 text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-sm">
          <div className="w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-theme-accent shrink-0 overflow-hidden">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <i className="fas fa-user text-4xl" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <h2 className="text-3xl font-extrabold text-theme-primary truncate">{user?.fullName || user?.firstName || 'Student'}</h2>
              <button
                onClick={() => {
                  setNameInput(user?.fullName || user?.firstName || '')
                  setShowEditModal(true)
                  setNameError('')
                }}
                className="w-8 h-8 rounded-full bg-theme-bg border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all shrink-0"
                title="Edit name"
              >
                <i className="fas fa-pencil-alt text-xs" />
              </button>
            </div>
            <p className="text-theme-secondary mt-1">You have attempted {submissions.length} exam{submissions.length === 1 ? '' : 's'} in total.</p>
            {hasClerk ? (
              <button
                onClick={() => setShowLogoutDialog(true)}
                className="mt-4 inline-flex items-center px-4 py-2 rounded-xl bg-theme-error-bg text-theme-error-text border border-theme-error-border hover:opacity-80 transition-all font-bold text-sm"
              >
                <i className="fas fa-sign-out-alt mr-2" />
                Logout
              </button>
            ) : null}
          </div>
        </div>


        {/* Tasks History Section */}
        <h3 className="text-xl font-bold text-theme-primary mb-4 border-b border-theme-border pb-2">Tasks History</h3>

        {tasksLoading ? (
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 mb-10 shadow-sm flex flex-col sm:flex-row items-center gap-6">
            <div className="skeleton w-16 h-16 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-3 w-full">
              <div className="skeleton h-5 w-1/3 rounded-lg" />
              <div className="skeleton h-4 w-2/3 rounded-lg" />
            </div>
            <div className="skeleton h-10 w-32 rounded-xl shrink-0 mt-4 sm:mt-0" />
          </div>
        ) : taskSummary ? (
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 mb-10 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 transition-all hover:border-indigo-500/30">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                <i className="fas fa-check-double text-2xl" />
              </div>
              <div>
                <h4 className="font-bold text-theme-primary text-lg">Productivity Summary</h4>
                <p className="text-theme-secondary text-sm mt-1">
                  <span className="font-bold text-theme-primary">{taskSummary.totalCompletedTasks}/{taskSummary.totalTasks}</span> weekly tasks completed and <span className="font-bold text-theme-primary">{taskSummary.totalHabitsCompleted}</span> daily habits checked off.
                </p>
              </div>
            </div>
            <Link
              href="/tasks/history"
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold bg-theme-accent text-white hover:opacity-90 shadow-md border border-theme-accent transition-all text-center flex items-center justify-center gap-2 shrink-0"
            >
              <i className="fas fa-chart-line" /> View Analytics
            </Link>
          </div>
        ) : (
          <div className="text-center py-10 bg-theme-surface border border-theme-border rounded-2xl mb-10 shadow-sm">
            <i className="fas fa-tasks text-4xl text-theme-secondary opacity-40 mb-3" />
            <p className="text-theme-secondary font-medium">No task data available.</p>
          </div>
        )}

        {/* Exam History Section */}
        <h3 className="text-xl font-bold text-theme-primary mb-4 border-b border-theme-border pb-2">Exam History</h3>

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="bg-theme-surface border border-theme-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-5 w-2/3 rounded-lg" />
                  <div className="skeleton h-4 w-1/2 rounded-lg" />
                </div>
                <div className="skeleton h-10 w-20 rounded-xl" />
              </div>
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-16 bg-theme-surface border border-theme-border rounded-2xl shadow-sm">
            <i className="fas fa-inbox text-5xl text-theme-secondary opacity-40 mb-3" />
            <p className="text-theme-secondary font-medium">No exams taken yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => {
              const percentage = (submission.score / submission.total) * 100
              return (
                <div key={submission._id} onClick={() => router.push(`/profile/submission/${submission._id}`)} className="group bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all cursor-pointer hover:border-theme-accent hover:shadow-md">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-bold text-theme-primary text-lg truncate">{submission.examId?.title || 'Unknown Exam'}</h4>
                      {submission.wasLive ? <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-theme-success-bg text-theme-success-text border border-theme-success-border rounded-md">Live</span> : <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-theme-bg text-theme-secondary border border-theme-border rounded-md">Practice</span>}
                    </div>
                    <p className="text-xs text-theme-secondary">
                      <i className="fas fa-calendar-alt mr-1.5" />
                      {new Date(submission.submittedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    <p className="text-[10px] text-theme-secondary mt-2 font-bold sm:hidden"><i className="fas fa-hand-pointer mr-1" />Tap to view details</p>
                  </div>
                  <div className="flex items-center gap-6 w-full sm:w-auto pl-2 sm:pl-4 border-l-0 sm:border-l border-theme-border mt-3 sm:mt-0 pr-2">
                    <div className="text-center flex-1 sm:flex-none">
                      <p className="text-[10px] uppercase font-bold text-theme-secondary mb-0.5">Score</p>
                      <p className={`font-black text-xl ${percentage >= 70 ? 'text-theme-success-text' : percentage >= 40 ? 'text-yellow-500' : 'text-theme-error-text'}`}>{submission.score}<span className="text-sm text-theme-secondary font-medium">/{submission.total}</span></p>
                    </div>
                    <div className="text-center flex-1 sm:flex-none">
                      <p className="text-[10px] uppercase font-bold text-theme-secondary mb-0.5">Percent</p>
                      <p className="font-bold text-theme-primary">{percentage.toFixed(0)}%</p>
                    </div>
                    <div className="hidden sm:flex text-theme-secondary opacity-50 group-hover:opacity-100 group-hover:text-theme-accent transition-all ml-2">
                      <i className="fas fa-chevron-right" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <div className="max-w-4xl mx-auto px-4 mb-8 mt-12">
        {/* Security / Password section */}
        {hasClerk ? (
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-theme-primary mb-6"><i className="fas fa-lock mr-2 text-theme-secondary" /> Security</h3>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
              {passwordError && <div className="p-3 bg-theme-error-bg text-theme-error-text text-sm rounded-xl">{passwordError}</div>}
              {passwordSuccess && <div className="p-3 bg-theme-success-bg text-theme-success-text text-sm rounded-xl">{passwordSuccess}</div>}

              <div>
                <label className="block text-sm font-bold text-theme-secondary mb-1.5">Current Password</label>
                <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-theme-bg border border-theme-border text-theme-primary outline-none focus:ring-2 focus:ring-theme-accent" />
              </div>

              <div>
                <label className="block text-sm font-bold text-theme-secondary mb-1.5">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-theme-bg border border-theme-border text-theme-primary outline-none focus:ring-2 focus:ring-theme-accent" />
              </div>

              <div>
                <label className="block text-sm font-bold text-theme-secondary mb-1.5">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-theme-bg border border-theme-border text-theme-primary outline-none focus:ring-2 focus:ring-theme-accent" />
              </div>

              <button type="submit" disabled={passwordLoading} className="mt-2 bg-theme-accent text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 disabled:opacity-60 transition-all text-sm w-full sm:w-auto">
                {passwordLoading ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </div>
        ) : null}
      </div>

      <div className="max-w-4xl mx-auto px-4 text-center">
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="bg-theme-error-bg text-theme-error-text border border-theme-error-border hover:bg-red-500/10 transition-colors px-6 py-3 rounded-xl font-bold shadow-sm inline-flex items-center gap-2"
        >
          <i className="fas fa-user-times" /> Delete Account
        </button>
      </div>

      {showEditModal ? (() => {
        const isNewUser = !user?.fullName && !user?.firstName

        if (typeof document === 'undefined') return null
        return createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 modal-backdrop">
            <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 max-w-sm w-full shadow-2xl modal-panel">
              {isNewUser ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-center mb-4">
                    <i className="fas fa-hand-wave text-2xl text-theme-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-theme-primary mb-2">Welcome! What's your name?</h3>
                  <p className="text-theme-secondary text-sm mb-5">Your name will appear on leaderboards and exam results.</p>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-theme-primary mb-2">Edit Name</h3>
                  <p className="text-theme-secondary text-sm mb-5">Update the name shown across your IT Resource Zone profile.</p>
                </>
              )}
              {nameError ? <div className="mb-4 p-3 bg-theme-error-bg border border-theme-error-border text-theme-error-text rounded-xl text-sm">{nameError}</div> : null}
              <input
                autoFocus
                type="text"
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && saveNewName()}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-3 rounded-xl bg-theme-bg border border-theme-border text-theme-primary outline-none focus:ring-2 focus:ring-theme-accent mb-4"
              />
              <button onClick={saveNewName} disabled={savingName || !nameInput.trim()} className="w-full bg-theme-accent text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-60">
                {savingName ? 'Saving...' : isNewUser ? 'Set My Name →' : 'Save'}
              </button>
              {!isNewUser ? (
                <button onClick={() => setShowEditModal(false)} className="mt-3 w-full bg-theme-bg text-theme-primary border border-theme-border font-bold py-3 rounded-xl hover:opacity-80 transition-all">
                  Cancel
                </button>
              ) : null}
            </div>
          </div>,
          document.body
        )
      })() : null}

      {/* Logout Confirmation Modal */}
      {showLogoutDialog && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm modal-backdrop" onClick={() => setShowLogoutDialog(false)} />
          <div className="relative bg-theme-surface border border-theme-border rounded-3xl p-8 max-w-sm w-full shadow-2xl modal-panel text-theme-primary">
            <div className="w-16 h-16 rounded-full bg-theme-bg text-theme-secondary flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-sign-out-alt text-3xl" />
            </div>
            <h3 className="text-2xl font-black text-center mb-2">Logout?</h3>
            <p className="text-theme-secondary text-center mb-8">
              Are you sure you want to log out of your account?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLogoutDialog(false)}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-theme-bg text-theme-secondary hover:text-theme-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowLogoutDialog(false)
                  await signOut?.({ redirectUrl: '/' })
                }}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-theme-accent text-white hover:opacity-90 transition-colors shadow-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteDialog && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm modal-backdrop" onClick={() => !deletingAccount && setShowDeleteDialog(false)} />
          <div className="relative bg-theme-surface border border-theme-border rounded-3xl p-8 max-w-sm w-full shadow-2xl modal-panel text-theme-primary">
            <div className="w-16 h-16 rounded-full bg-theme-error-bg text-theme-error-text flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-user-times text-3xl" />
            </div>
            <h3 className="text-2xl font-black text-center mb-2">Delete Account?</h3>
            <p className="text-theme-secondary text-center mb-8">
              This action is <span className="font-bold text-theme-error-text">permanent</span> and cannot be undone. Your sign-in account will be deleted immediately. Full deletion of saved exam and task records is still being improved.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteDialog(false)}
                disabled={deletingAccount}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-theme-bg text-theme-secondary hover:text-theme-primary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-md disabled:opacity-50"
              >
                {deletingAccount ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
