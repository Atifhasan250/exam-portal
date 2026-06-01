'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import PageSkeleton from '@/components/PageSkeleton'
import AuthCallout from '@/components/AuthCallout'

const intensityClasses = [
  'bg-theme-progress-track',
  'bg-theme-accent/20',
  'bg-theme-accent/40',
  'bg-theme-accent/70',
  'bg-theme-accent',
]

export default function DashboardClient() {
  const { user, isLoaded } = useUser()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded) return
    if (!user) {
      setLoading(false)
      return
    }

    let active = true
    fetch('/api/dashboard/summary')
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!active) return
        if (!response.ok) throw new Error(data.error || 'Failed to load dashboard')
        setSummary(data)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load dashboard')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [isLoaded, user])

  const name = user?.firstName || user?.username || 'Student'
  if (!isLoaded || loading) return <PageSkeleton />

  if (!user) {
    return (
      <div className="bg-theme-bg min-h-screen py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <AuthCallout
            title="Login first to see your dashboard"
            description="Your learning dashboard is built from your exam, planner, and resource activity."
            href="/sign-in?redirect_url=/dashboard"
          />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-theme-bg text-theme-primary flex items-center justify-center px-4">
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 max-w-md text-center">
          <i className="fas fa-triangle-exclamation text-4xl text-theme-error-text mb-4" />
          <h1 className="text-xl font-black mb-2">Dashboard unavailable</h1>
          <p className="text-theme-secondary text-sm mb-5">{error}</p>
          <button onClick={() => location.reload()} className="px-5 py-3 bg-theme-accent text-theme-accent-text rounded-xl font-bold">
            Retry
          </button>
        </div>
      </main>
    )
  }

  const metrics = summary?.metrics || {}
  
  const validDays = summary?.heatmap?.filter(day => day !== null) || []
  const last30Days = validDays.slice(-30)
  const activeInLast30 = last30Days.filter(day => day.intensity > 0).length
  const consistencyPercent = last30Days.length ? Math.round((activeInLast30 / last30Days.length) * 100) : 0

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme pb-24 page-enter">
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Dashboard</h1>
            <p className="text-theme-secondary mt-1">{name}, here is your learning snapshot.</p>
          </div>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
          <Metric label="Avg Score" value={`${metrics.averageScore || 0}%`} icon="fa-chart-line" />
          <Metric label="Best Score" value={`${metrics.bestScore || 0}%`} icon="fa-trophy" />
          <Metric label="Consistency" value={`${consistencyPercent}%`} icon="fa-fire" />
          <Metric label="Resources" value={`${metrics.resourcesCompleted || 0}/${metrics.resourcesStarted || 0}`} icon="fa-book-open" />
        </section>

        <div className="grid lg:grid-cols-12 gap-5">
          <ContinueNextCard action={summary.continueAction} />

          <section className="lg:col-span-5 bg-theme-surface border border-theme-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black">Consistency</h2>
              <span className="text-xs font-bold text-theme-secondary">90 days</span>
            </div>
            <div className="flex justify-center w-full mt-2">
              <div className="grid grid-flow-col grid-rows-7 gap-1.5 sm:gap-2">
                {(summary.heatmap || []).map((day, index) => {
                  if (!day) return <div key={`empty-${index}`} className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                  return (
                    <div key={day.date} className="relative group">
                      <span className={`block w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-[3px] sm:rounded-sm ${intensityClasses[day.intensity] || intensityClasses[0]}`} />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] pointer-events-none flex flex-col items-center">
                        <div className="bg-theme-primary text-theme-bg text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-xl">
                          <p className="font-black text-[13px] mb-1">{day.date}</p>
                          <p className="font-semibold text-[11px] text-theme-bg/80">
                            {[
                              day.completedHabits ? `${day.completedHabits} habits` : null,
                              day.taskActivity ? 'tasks' : null,
                              day.resourceActivity ? 'resources' : null,
                              day.examActivity ? 'exams' : null
                            ].filter(Boolean).join(', ') || 'No activity'}
                          </p>
                        </div>
                        <div className="w-2.5 h-2.5 bg-theme-primary transform rotate-45 -mt-1.5 rounded-sm"></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="lg:col-span-7 bg-theme-surface border border-theme-border rounded-2xl p-5 overflow-hidden">
            <h2 className="text-lg font-black mb-4">Recent Exam Results</h2>
            <div className="space-y-3">
              {(summary.recentExams || []).length ? summary.recentExams.map((exam) => (
                <Link key={exam.id} href={`/profile/submission/${exam.id}`} className="flex items-center justify-between gap-4 bg-theme-bg border border-theme-border rounded-xl p-4 hover:border-theme-accent transition-colors">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{exam.title}</p>
                    <p className="text-xs text-theme-secondary">{exam.wasLive ? 'Live' : 'Practice'} - {new Date(exam.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <p className="font-black text-theme-accent">{exam.percentage}%</p>
                </Link>
              )) : (
                <EmptyState icon="fa-inbox" text="No exam history yet." />
              )}
            </div>
          </section>

          <section className="lg:col-span-5 bg-theme-surface border border-theme-border rounded-2xl p-5 overflow-hidden">
            <h2 className="text-lg font-black mb-4">Resource Progress</h2>
            <div className="space-y-3">
              {(summary.resources || []).length ? summary.resources.map((resource) => (
                <Link key={resource.id} href={resource.href} className="block bg-theme-bg border border-theme-border rounded-xl p-4 hover:border-theme-accent transition-colors">
                  <div className="flex justify-between gap-3 text-sm font-bold mb-2">
                    <span className="truncate min-w-0">{resource.title}</span>
                    <span className="flex-shrink-0">{resource.percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-theme-progress-track overflow-hidden">
                    <div className="h-full bg-theme-accent" style={{ width: `${resource.percent}%` }} />
                  </div>
                </Link>
              )) : (
                <EmptyState icon="fa-book-open" text="No resources started yet." />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function Metric({ label, value, icon }) {
  return (
    <div className="bg-theme-surface border border-theme-border rounded-2xl p-4">
      <div className="w-10 h-10 rounded-xl bg-theme-accent/10 text-theme-accent flex items-center justify-center mb-3">
        <i className={`fas ${icon}`} />
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wide text-theme-secondary mt-1">{label}</p>
    </div>
  )
}

function ContinueNextCard({ action }) {
  const title = action?.title || action?.detail || 'Choose your next learning action.'
  const href = action?.href || '/resources'
  const label = action?.label || 'Open resources'
  const hasProgress = Number.isFinite(action?.percent)
  const duration = formatDuration(action?.durationSeconds)
  return (
    <section className="lg:col-span-7 bg-theme-surface border border-theme-border rounded-2xl p-5 overflow-hidden">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-black">Continue next</h2>
        {hasProgress ? (
          <span className="text-xs font-bold text-theme-secondary">{action.percent}% progress</span>
        ) : null}
      </div>

      <div className="grid min-[860px]:grid-cols-[minmax(220px,0.9fr)_1fr] gap-5 items-center">
        <Link href={href} className="group relative block w-full aspect-video overflow-hidden rounded-xl bg-theme-progress-track border border-theme-border">
          {action?.thumbnailUrl ? (
            <img
              src={action.thumbnailUrl}
              alt={`${title} thumbnail`}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-theme-secondary">
              <i className="fas fa-play text-3xl opacity-60" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
          <span className="absolute left-3 bottom-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-theme-accent text-theme-accent-text shadow-lg">
            <i className="fas fa-play text-sm" />
          </span>
        </Link>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-theme-secondary mb-2">
            {action?.type === 'youtube' ? 'Video resource' : 'Learning resource'}
            {duration ? ` - ${duration}` : ''}
          </p>
          <h3 className="text-lg sm:text-xl font-black leading-snug break-words">{title}</h3>
          {hasProgress ? (
            <div className="mt-4">
              <div className="h-2 rounded-full bg-theme-progress-track overflow-hidden">
                <div className="h-full bg-theme-accent" style={{ width: `${Math.max(0, Math.min(100, action.percent))}%` }} />
              </div>
            </div>
          ) : null}
          <div className="mt-5 grid min-[560px]:grid-cols-2 min-[860px]:grid-cols-1 xl:grid-cols-2 gap-3">
            <Link href={href} className="min-h-12 px-4 py-3 bg-theme-accent text-theme-accent-text rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 text-center">
              <i className="fas fa-play" />
              {label}
            </Link>
            <Link href="/exams" className="min-h-12 px-4 py-3 bg-theme-bg border border-theme-border rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 text-center">
              <i className="fas fa-layer-group" />
              Practice exam
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function formatDuration(seconds) {
  const value = Number(seconds || 0)
  if (!value) return ''
  const minutes = Math.max(1, Math.round(value / 60))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`
}

function EmptyState({ icon, text }) {
  return (
    <div className="w-full h-full min-h-36 flex flex-col items-center justify-center text-theme-secondary text-center">
      <i className={`fas ${icon} text-3xl opacity-40 mb-3`} />
      <p className="text-sm font-semibold">{text}</p>
    </div>
  )
}
