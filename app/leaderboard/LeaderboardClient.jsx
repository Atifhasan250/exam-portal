'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LeaderboardClient({ initialData, selectedExamId = null }) {
  const [data, setData] = useState(() => normalizeLeaderboardData(initialData, selectedExamId))
  const [loading, setLoading] = useState(!normalizeLeaderboardData(initialData, selectedExamId).length)
  const [loadingMore, setLoadingMore] = useState(false)
  const router = useRouter()
  const CACHE_TTL_MS = 30 * 1000

  useEffect(() => {
    if (selectedExamId) return

    if (initialData?.length) {
      sessionStorage.setItem('leaderboard_cache', JSON.stringify({ items: initialData, cachedAt: Date.now() }))
      return
    }

    const cached = sessionStorage.getItem('leaderboard_cache')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Date.now() - (parsed.cachedAt || 0) < CACHE_TTL_MS) {
          setData(parsed.items || [])
          setLoading(false)
          return
        }
      } catch {
        sessionStorage.removeItem('leaderboard_cache')
      }
    }

    fetch('/api/leaderboard')
      .then((response) => response.json())
      .then((items) => {
        const list = Array.isArray(items) ? items : []
        setData(list)
        sessionStorage.setItem('leaderboard_cache', JSON.stringify({ items: list, cachedAt: Date.now() }))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [initialData, selectedExamId])

  const selectedData = selectedExamId ? data.find((item) => item.exam?._id === selectedExamId) : null
  const fmtDate = (date) => new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

  const getRankStyle = (rank) => {
    if (rank === 1) return 'bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
    if (rank === 2) return 'bg-theme-secondary/10 border-theme-secondary/30 text-theme-secondary'
    if (rank === 3) return 'bg-orange-500/10 border-orange-500 text-orange-600'
    return 'bg-theme-bg border-theme-border text-theme-secondary'
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return 'fas fa-crown'
    if (rank === 2) return 'fas fa-medal'
    if (rank === 3) return 'fas fa-award'
    return null
  }

  const loadMoreSubmissions = async () => {
    if (!selectedData || loadingMore) return

    setLoadingMore(true)
    try {
      const offset = selectedData.submissions.length
      const response = await fetch(`/api/exams/${selectedExamId}/leaderboard?limit=50&offset=${offset}`)
      if (!response.ok) return
      const page = await response.json()
      if (!page?.exam) return

      setData((current) => current.map((item) => (
        item.exam?._id === selectedExamId
          ? {
              ...item,
              submissions: [...(item.submissions || []), ...(page.submissions || [])],
              submissionCount: page.submissionCount || page.totalCount || item.submissionCount || 0,
              totalCount: page.totalCount || item.totalCount || 0,
              hasMore: Boolean(page.hasMore),
            }
          : item
      )))
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme pb-20 page-enter">

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        {!selectedExamId ? (
          <div className="flex items-center space-x-3 mb-2">
            <Link href="/exams" className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all shrink-0">
              <i className="fas fa-arrow-left" />
            </Link>
            <h2 className="text-3xl font-extrabold text-theme-primary">Live Exam Leaderboards</h2>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-5">
            <div className="skeleton h-10 w-64 rounded-xl" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((item) => (
                <div key={item} className="bg-theme-surface border border-theme-border rounded-2xl p-6 space-y-3">
                  <div className="skeleton h-6 w-3/4 rounded-lg" />
                  <div className="skeleton h-4 w-1/2 rounded-lg" />
                  <div className="skeleton h-4 w-2/3 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20 text-theme-secondary">
            <i className="fas fa-trophy text-5xl mb-4 opacity-30" />
            <p className="font-medium">No live exam results yet.</p>
          </div>
        ) : !selectedExamId ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.map(({ exam, submissions, submissionCount }, index) => (
              <div key={exam._id} onClick={() => router.push(`/leaderboard/${exam._id}`)} className="card-enter bg-theme-surface border border-theme-border rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-500/40 hover:-translate-y-1 transition-all cursor-pointer" style={{ animationDelay: `${index * 80}ms` }}>
                <div>
                  <h3 className="font-bold text-theme-primary text-lg leading-snug mb-3">{exam.title}</h3>
                  <div className="space-y-1 text-sm text-theme-secondary">
                    <p><i className="fas fa-clock mr-2" />{exam.duration} min</p>
                    <p><i className="fas fa-calendar-alt mr-2" />Ended: {new Date(exam.liveEnd).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-theme-border pt-4 mt-2">
                  <span className="text-sm font-bold text-theme-accent bg-indigo-500/10 px-3 py-1 rounded-lg">
                    <i className="fas fa-users mr-2" />{submissionCount ?? submissions.length} Taken
                  </span>
                  <i className="fas fa-arrow-right text-theme-secondary" />
                </div>
              </div>
            ))}
          </div>
        ) : selectedData ? (
          <section className="space-y-6">
            <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 shadow-sm flex items-start gap-4">
              <button onClick={() => router.push('/leaderboard')} className="w-10 h-10 shrink-0 rounded-full bg-theme-bg flex items-center justify-center border border-theme-border text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all mt-0.5">
                <i className="fas fa-arrow-left" />
              </button>
              <div>
                <h2 className="text-2xl font-extrabold text-theme-primary">{selectedData.exam.title}</h2>
                <p className="text-sm text-theme-secondary mt-1">
                  <i className="fas fa-calendar-alt mr-1.5" />{fmtDate(selectedData.exam.liveStart)} - {fmtDate(selectedData.exam.liveEnd)}
                </p>
              </div>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-12 gap-2 px-3 sm:px-5 py-3 text-[10px] sm:text-xs uppercase tracking-wider font-bold text-theme-secondary border-b border-theme-border bg-theme-bg/50">
                <div className="col-span-2 sm:col-span-1 text-center">#</div>
                <div className="col-span-5 sm:col-span-3 pl-1">Name</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-2 text-center hidden sm:block">Wrong</div>
                <div className="col-span-2 text-center hidden sm:block">Skipped</div>
                <div className="col-span-3 sm:col-span-2 text-right">Time</div>
              </div>

              {selectedData.submissions.map((submission, index) => {
                const rank = index + 1
                return (
                  <div key={submission._id} className={`card-enter grid grid-cols-12 gap-2 px-3 sm:px-5 py-3.5 items-center text-sm border-b border-theme-border last:border-b-0 transition-colors hover:bg-theme-bg/50 ${rank <= 3 ? 'bg-theme-bg/30' : ''}`} style={{ animationDelay: `${index * 60}ms` }}>
                    <div className="col-span-2 sm:col-span-1 flex justify-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${getRankStyle(rank)} ${rank <= 3 ? 'rank-pop' : ''}`}>
                        {rank <= 3 ? <i className={getRankIcon(rank)} /> : rank}
                      </span>
                    </div>
                    <div className="col-span-5 sm:col-span-3 font-semibold text-theme-primary truncate pl-1">{submission.studentName}</div>
                    <div className="col-span-2 text-center">
                      <span className="font-bold text-theme-accent">{submission.score}</span>
                      <span className="text-theme-secondary">/{submission.total}</span>
                    </div>
                    <div className="col-span-2 text-center hidden sm:block text-theme-error-text font-medium">{submission.wrong}</div>
                    <div className="col-span-2 text-center hidden sm:block text-theme-secondary">{submission.unanswered}</div>
                    <div className="col-span-3 sm:col-span-2 text-right text-xs text-theme-secondary">
                      {new Date(submission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}
              {selectedData.hasMore ? (
                <div className="p-4 bg-theme-bg/30">
                  <button
                    onClick={loadMoreSubmissions}
                    disabled={loadingMore}
                    className="w-full px-4 py-3 rounded-xl bg-theme-surface border border-theme-border text-sm font-bold text-theme-secondary hover:text-theme-primary disabled:opacity-60"
                  >
                    {loadingMore ? 'Loading...' : 'Load More Results'}
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}

function normalizeLeaderboardData(initialData, selectedExamId) {
  if (selectedExamId && initialData?.exam) return [initialData]
  return Array.isArray(initialData) ? initialData : []
}
