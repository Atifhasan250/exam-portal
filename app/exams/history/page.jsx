'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import PageSkeleton from '@/components/PageSkeleton'

export default function ExamHistoryPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [appendError, setAppendError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const fetchHistory = useCallback(async (currentOffset, append = false) => {
    if (!user) return
    try {
      if (append) setAppendError('')
      else setError('')
      const res = await fetch(`/api/submissions/user/${encodeURIComponent(user.id)}?limit=20&offset=${currentOffset}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load history')
      
      setSubmissions(prev => append ? [...prev, ...data.submissions] : data.submissions)
      setHasMore(data.hasMore)
      setOffset(data.nextOffset)
    } catch (err) {
      if (append) setAppendError(err.message)
      else setError(err.message)
    }
  }, [user])

  useEffect(() => {
    if (!isLoaded) return
    if (!user) {
      router.push('/sign-in?redirect_url=/exams/history')
      return
    }
    fetchHistory(0).finally(() => setLoading(false))
  }, [isLoaded, user, fetchHistory, router])

  const handleLoadMore = async () => {
    setLoadingMore(true)
    await fetchHistory(offset, true)
    setLoadingMore(false)
  }

  if (!isLoaded || loading) return <PageSkeleton />

  if (error) {
    return (
      <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme pb-20">
        <main className="max-w-3xl mx-auto px-4 mt-8">
          <div className="text-center p-8 bg-theme-surface border border-theme-border rounded-2xl">
            <p className="text-theme-error-text mb-4">{error}</p>
            <button onClick={() => location.reload()} className="px-4 py-2 bg-theme-accent text-theme-accent-text rounded-xl font-bold">Retry</button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme pb-24 page-enter">
      <main className="max-w-3xl mx-auto px-4 mt-8 space-y-6">
        <div className="flex items-center space-x-3">
          <button onClick={() => router.back()} aria-label="Go back" title="Go back" className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all">
            <i className="fas fa-arrow-left" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-theme-primary truncate">Exam History</h1>
        </div>

        <section className="bg-theme-surface border border-theme-border rounded-2xl overflow-hidden shadow-sm">
          {submissions.length === 0 ? (
            <div className="text-center py-16 text-theme-secondary">
              <i className="fas fa-inbox text-5xl mb-4 opacity-40" />
              <p className="font-medium text-lg text-theme-primary">No exam history found.</p>
              <p className="text-sm mt-1">Take a practice exam to start building your history!</p>
              <Link href="/exams" className="mt-6 inline-block px-5 py-3 bg-theme-accent text-theme-accent-text font-bold rounded-xl shadow-md">
                Browse Exams
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-theme-border">
              {submissions.map((exam) => {
                const total = Number(exam.total) || 0
                const score = Number(exam.score) || 0
                const percent = total ? Math.round((score / total) * 100) : 0
                const title = exam.examId?.title || exam.title || 'Deleted Exam'
                const type = exam.wasLive ? 'Live Exam' : 'Practice Exam'
                const date = new Date(exam.submittedAt).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric', year: 'numeric'
                })

                return (
                  <Link 
                    key={exam._id} 
                    href={`/profile/submission/${exam._id}`}
                    className="flex items-center justify-between p-4 sm:p-5 bg-theme-surface hover:bg-theme-bg transition-colors group cursor-pointer"
                  >
                    <div className="min-w-0 pr-4">
                      <h3 className="font-bold text-base sm:text-lg text-theme-primary truncate group-hover:text-theme-accent transition-colors">
                        {title}
                      </h3>
                      <p className="text-xs sm:text-sm text-theme-secondary mt-1">
                        <span className="font-semibold">{type}</span> • {date}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className={`font-black text-lg ${percent >= 70 ? 'text-theme-success-text' : percent >= 40 ? 'text-yellow-500' : 'text-theme-error-text'}`}>
                          {percent}%
                        </p>
                        <p className="text-xs font-bold uppercase tracking-wide text-theme-secondary">
                          {score}/{total}
                        </p>
                      </div>
                      <i className="fas fa-chevron-right text-theme-secondary opacity-50 group-hover:opacity-100 group-hover:text-theme-accent transition-all transform group-hover:translate-x-1 text-sm sm:text-base" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {hasMore && (
          <div className="text-center pt-4">
            {appendError ? <p className="text-sm text-theme-error-text mb-3">{appendError}</p> : null}
            <button 
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-3 bg-theme-bg border border-theme-border rounded-xl font-bold text-sm text-theme-primary hover:border-theme-accent hover:text-theme-accent transition-all disabled:opacity-50"
            >
              {loadingMore ? (
                <span><i className="fas fa-circle-notch fa-spin mr-2" /> Loading...</span>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
