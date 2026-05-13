'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal states
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetails, setUserDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState('')

  const router = useRouter()

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/users')
        if (response.status === 401) {
          router.push('/admin')
          return
        }
        if (!response.ok) {
          throw new Error('Failed to fetch users')
        }
        const data = await response.json()
        setUsers(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [router])

  const openUserDetails = async (user) => {
    setSelectedUser(user)
    setUserDetails(null)
    setDetailsError('')
    setLoadingDetails(true)

    try {
      const response = await fetch(`/api/admin/users/${user.id}`)
      if (!response.ok) throw new Error('Failed to fetch user details')
      const data = await response.json()
      setUserDetails(data)
    } catch (err) {
      setDetailsError(err.message)
    } finally {
      setLoadingDetails(false)
    }
  }

  const closeUserDetails = () => {
    setSelectedUser(null)
    setUserDetails(null)
  }

  useEffect(() => {
    if (selectedUser) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [selectedUser])

  const fmtDate = (date) => date ? new Date(date).toLocaleString([], { dateStyle: 'medium' }) : '—'

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme page-enter">
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 mt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-theme-primary mb-1">User List</h2>
            <p className="text-theme-secondary text-sm">{users.length} user(s) registered</p>
          </div>
          <Link href="/admin/dashboard" className="px-4 py-3 text-sm font-bold bg-theme-bg text-theme-secondary border border-theme-border rounded-xl hover:text-theme-primary transition-all flex items-center justify-center whitespace-nowrap shadow-sm">
            <i className="fas fa-arrow-left mr-2" />
            <span>Dashboard</span>
          </Link>
        </div>

        {error ? (
          <div className="bg-theme-error-bg border border-theme-error-border text-theme-error-text p-4 rounded-xl text-sm font-bold">
            <i className="fas fa-exclamation-triangle mr-2" />{error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="bg-theme-surface border border-theme-border rounded-2xl p-5 flex items-center gap-4">
                <div className="skeleton w-12 h-12 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-5 w-3/4 rounded-lg" />
                  <div className="skeleton h-3 w-1/2 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-theme-secondary">
            <i className="fas fa-users-slash text-5xl mb-4 opacity-40" />
            <p className="font-medium">No users found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => openUserDetails(user)}
                className="bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-theme-accent/50 transition-all flex items-center gap-4 cursor-pointer group"
              >
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt={user.firstName || 'User'} className="w-12 h-12 rounded-full shrink-0 border border-theme-border object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-theme-bg flex items-center justify-center text-theme-secondary shrink-0 border border-theme-border group-hover:scale-105 transition-transform">
                    <i className="fas fa-user text-xl" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-theme-primary text-base truncate group-hover:text-theme-accent transition-colors">
                    {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Anonymous User'}
                  </h3>
                  <p className="text-theme-secondary text-xs truncate mb-1">{user.emailAddress || 'No email provided'}</p>
                  <p className="text-theme-secondary text-[10px] uppercase tracking-wider font-semibold opacity-70">Joined: {fmtDate(user.createdAt)}</p>
                </div>
                <i className="fas fa-chevron-right text-theme-border group-hover:text-theme-accent transition-colors shrink-0 text-sm" />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* User Details Modal */}
      {selectedUser && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-start justify-center p-4 overflow-y-auto modal-backdrop">
          <div className="bg-theme-surface border border-theme-border rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl my-8 modal-panel relative">

            <button
              onClick={closeUserDetails}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-theme-bg flex items-center justify-center text-theme-secondary hover:text-theme-primary border border-theme-border transition-all hover:scale-105"
            >
              <i className="fas fa-times" />
            </button>

            <div className="flex items-center gap-4 mb-8">
              {selectedUser.imageUrl ? (
                <img src={selectedUser.imageUrl} alt="Avatar" className="w-16 h-16 rounded-full shrink-0 border-2 border-theme-border object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-theme-bg flex items-center justify-center text-theme-secondary shrink-0 border-2 border-theme-border">
                  <i className="fas fa-user text-2xl" />
                </div>
              )}
              <div>
                <h3 className="text-2xl font-bold text-theme-primary">
                  {[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ') || selectedUser.username || 'Anonymous User'}
                </h3>
                <p className="text-theme-secondary text-sm">{selectedUser.emailAddress || 'No email provided'}</p>
              </div>
            </div>

            {loadingDetails ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12">
                <div className="w-10 h-10 border-4 border-theme-accent/30 border-t-theme-accent rounded-full animate-spin mb-4" />
                <p className="text-theme-secondary font-medium">Loading user data...</p>
              </div>
            ) : detailsError ? (
              <div className="flex-1 bg-theme-error-bg text-theme-error-text p-4 rounded-xl border border-theme-error-border text-center">
                <i className="fas fa-exclamation-triangle mb-2 text-xl block" />
                <p className="font-bold">{detailsError}</p>
              </div>
            ) : userDetails ? (
              <div className="space-y-8">

                {/* Progress Overview Section */}
                <section>
                  <h4 className="text-lg font-bold text-theme-primary mb-4 flex items-center gap-2">
                    <i className="fas fa-chart-line text-theme-accent" /> Progress Overview
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Weekly Tasks */}
                    <div className="bg-theme-bg border border-theme-border rounded-2xl p-5 shadow-sm">
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-sm font-bold text-theme-secondary"><i className="fas fa-tasks mr-2 opacity-50" />Weekly Tasks</span>
                        <span className="text-2xl font-black text-theme-primary">{userDetails.tasks.progressPercentage}%</span>
                      </div>
                      <div className="w-full h-3 bg-theme-surface rounded-full overflow-hidden border border-theme-border mb-3">
                        <div
                          className="h-full bg-theme-accent transition-all duration-1000"
                          style={{ width: `${userDetails.tasks.progressPercentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-theme-secondary font-semibold">
                        {userDetails.tasks.completed} out of {userDetails.tasks.total} tasks completed
                      </p>
                    </div>

                    {/* Daily Habits */}
                    <div className="bg-theme-bg border border-theme-border rounded-2xl p-5 shadow-sm">
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-sm font-bold text-theme-secondary"><i className="fas fa-calendar-check mr-2 opacity-50" />Daily Habits</span>
                        <span className="text-2xl font-black text-emerald-500">{userDetails.tasks.habitsPercentage}%</span>
                      </div>
                      <div className="w-full h-3 bg-theme-surface rounded-full overflow-hidden border border-theme-border mb-3">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-1000"
                          style={{ width: `${userDetails.tasks.habitsPercentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-theme-secondary font-semibold">
                        Tracked across {userDetails.tasks.daysTracked || 0} day(s)
                      </p>
                    </div>
                  </div>
                </section>

                {/* Advanced Analytics Section */}
                {userDetails.tasks.analytics && (
                  <section>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                      {[
                        { label: 'Current Streak', value: userDetails.tasks.analytics.currentStreak, icon: 'fa-fire', color: 'text-orange-500', bg: 'bg-orange-500/10' },
                        { label: 'Best Streak', value: userDetails.tasks.analytics.bestStreak, icon: 'fa-trophy', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                        { label: 'Power Days', value: userDetails.tasks.analytics.powerDays, icon: 'fa-bolt', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                        { label: '7-Day Avg', value: `${userDetails.tasks.analytics.sevenDayAvg}%`, icon: 'fa-chart-pie', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        { label: 'Consistency', value: userDetails.tasks.analytics.consistency, icon: 'fa-bullseye', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                        { label: 'Active Days', value: userDetails.tasks.analytics.activeDays, icon: 'fa-calendar-check', color: 'text-purple-500', bg: 'bg-purple-500/10' },
                      ].map((stat, i) => (
                        <div key={i} className="bg-theme-bg border border-theme-border rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden group">
                          <div className={`absolute -right-3 -top-3 sm:-right-4 sm:-top-4 w-12 h-12 sm:w-16 sm:h-16 rounded-full ${stat.bg} opacity-50 group-hover:scale-150 transition-transform duration-500`} />
                          <i className={`fas ${stat.icon} ${stat.color} text-xl sm:text-2xl mb-2 sm:mb-3`} />
                          <span className="text-2xl sm:text-3xl font-extrabold text-theme-primary tracking-tight">{stat.value}</span>
                          <span className="text-[10px] sm:text-xs font-bold text-theme-secondary uppercase tracking-wider mt-1 sm:mt-2">{stat.label}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Exam History Section */}
                <section>
                  <h4 className="text-lg font-bold text-theme-primary mb-4 flex items-center gap-2">
                    <i className="fas fa-history text-theme-accent" /> Attended Exams
                  </h4>
                  {userDetails.exams.length === 0 ? (
                    <div className="bg-theme-bg border border-theme-border rounded-2xl p-8 text-center text-theme-secondary">
                      <i className="fas fa-inbox text-3xl mb-3 opacity-50" />
                      <p className="text-sm font-medium">No exams attended yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userDetails.exams.map(exam => (
                        <div key={exam.submissionId} className="bg-theme-bg border border-theme-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-bold text-theme-primary truncate text-sm">{exam.examTitle}</h5>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${exam.wasLive ? 'bg-theme-error-bg text-theme-error-text' : 'bg-theme-success-bg text-theme-success-text'}`}>
                                {exam.wasLive ? 'LIVE' : 'PRACTICE'}
                              </span>
                            </div>
                            <p className="text-xs text-theme-secondary">
                              <i className="far fa-clock mr-1" /> {fmtDate(exam.submittedAt)}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 bg-theme-surface px-4 py-2 rounded-lg border border-theme-border">
                            <div className="text-center">
                              <p className="text-[10px] text-theme-secondary font-bold uppercase tracking-wider mb-0.5">Marks</p>
                              <p className="text-sm font-black text-theme-primary">{exam.score}<span className="text-theme-secondary text-xs">/{exam.totalQuestions}</span></p>
                            </div>
                            <div className="w-px h-8 bg-theme-border" />
                            <div className="text-center">
                              <p className="text-[10px] text-theme-secondary font-bold uppercase tracking-wider mb-0.5">Rank</p>
                              <p className={`text-sm font-black ${exam.rank === 1 ? 'text-yellow-500' : exam.rank <= 3 ? 'text-theme-accent' : 'text-theme-primary'}`}>
                                {exam.rank ? `#${exam.rank}` : '-'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

              </div>
            ) : null}
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  )
}
