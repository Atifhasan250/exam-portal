'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import PageLoadingOverlay from '@/components/PageLoadingOverlay'

const EXAM_PAGE_SIZE = 12
const STATUS_LIST = ['live', 'upcoming', 'past']

export default function ExamsPageClient({ initialExamPages = null, initialExams = null }) {
  const hasInitialData = hasExamPageData(initialExamPages) || Array.isArray(initialExams)
  const [examPages, setExamPages] = useState(() => normalizeInitialExamPages(initialExamPages, initialExams))
  const [loading, setLoading] = useState(!hasInitialData)
  const [loadingMoreStatus, setLoadingMoreStatus] = useState({})
  const [consumedLiveIds, setConsumedLiveIds] = useState(new Set())
  const [liveAccessLoading, setLiveAccessLoading] = useState(true)
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const CACHE_TTL_MS = 30 * 1000

  useEffect(() => {
    if (hasInitialData) {
      const pages = normalizeInitialExamPages(initialExamPages, initialExams)
      setExamPages(pages)
      sessionStorage.setItem('exams_cache', JSON.stringify({ pages, cachedAt: Date.now() }))
      return
    }

    const cached = sessionStorage.getItem('exams_cache')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Date.now() - (parsed.cachedAt || 0) < CACHE_TTL_MS) {
          setExamPages(normalizeInitialExamPages(parsed.pages, parsed.items))
          setLoading(false)
          return
        }
      } catch {
        sessionStorage.removeItem('exams_cache')
      }
    }

    Promise.all(STATUS_LIST.map((status) => fetchExamPage(status, 0)))
      .then((pages) => {
        const nextPages = Object.fromEntries(STATUS_LIST.map((status, index) => [status, pages[index]]))
        setExamPages(nextPages)
        sessionStorage.setItem('exams_cache', JSON.stringify({ pages: nextPages, cachedAt: Date.now() }))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [hasInitialData, initialExamPages, initialExams])

  useEffect(() => {
    if (!isLoaded) {
      setLiveAccessLoading(true)
      return
    }

    if (!user?.id) {
      setConsumedLiveIds(new Set())
      setLiveAccessLoading(false)
      return
    }

    let active = true
    setLiveAccessLoading(true)
    fetch(`/api/submissions/user/${encodeURIComponent(user.id)}/live`)
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data)) {
          setConsumedLiveIds(new Set(data))
        }
      })
      .catch(() => { })
      .finally(() => {
        if (active) setLiveAccessLoading(false)
      })

    return () => { active = false }
  }, [isLoaded, user?.id])

  const fmtDate = (date) => new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

  const handleTakeExam = (examId) => {
    if (!isLoaded || liveAccessLoading) return
    if (!user) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(`/exam/${examId}`)}`)
      return
    }
    router.push(`/exam/${examId}`)
  }

  const loadMoreExams = async (status) => {
    if (loadingMoreStatus[status]) return

    const page = examPages[status] || emptyExamPage()
    setLoadingMoreStatus((current) => ({ ...current, [status]: true }))
    try {
      const nextPage = await fetchExamPage(status, page.nextOffset ?? page.exams.length)
      setExamPages((current) => {
        const currentPage = current[status] || emptyExamPage()
        const nextPages = {
          ...current,
          [status]: {
            ...nextPage,
            exams: mergeExams(currentPage.exams, nextPage.exams),
          },
        }
        sessionStorage.setItem('exams_cache', JSON.stringify({ pages: nextPages, cachedAt: Date.now() }))
        return nextPages
      })
    } catch {
      // Keep the current list usable if the incremental request fails.
    } finally {
      setLoadingMoreStatus((current) => ({ ...current, [status]: false }))
    }
  }

  if (loading) return (
    <PageLoadingOverlay>
      <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme">
        <main className="max-w-5xl mx-auto px-4 py-10 space-y-14">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="skeleton h-10 w-10 rounded-full" />
                <div className="skeleton h-9 w-40 rounded-xl" />
              </div>
              <div className="skeleton h-11 w-11 rounded-xl" />
            </div>
          </div>

          <div className="space-y-14">
            {[0, 1].map((section) => (
              <div key={section} className="space-y-5">
                <div className="skeleton h-8 w-48 rounded-xl" />
                <div className="grid sm:grid-cols-2 gap-5">
                  {[0, 1].map((item) => (
                    <div key={item} className="bg-theme-surface border border-theme-border rounded-2xl p-6 space-y-4">
                      <div className="skeleton h-6 w-3/4 rounded-lg" />
                      <div className="skeleton h-4 w-1/2 rounded-lg" />
                      <div className="skeleton h-4 w-2/3 rounded-lg" />
                      <div className="skeleton h-11 w-full rounded-xl mt-4" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </PageLoadingOverlay>
  )

  const livePage = examPages.live || emptyExamPage()
  const upcomingPage = examPages.upcoming || emptyExamPage()
  const pastPage = examPages.past || emptyExamPage()
  const liveExams = livePage.exams
  const upcomingExams = upcomingPage.exams
  const pastExams = pastPage.exams

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme page-enter">
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-14">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/" className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all shrink-0">
                <i className="fas fa-arrow-left" />
              </Link>
              <h1 className="text-3xl font-extrabold text-theme-primary">All Exams</h1>
            </div>
            <Link
              href="/leaderboard"
              className="flex items-center justify-center gap-2 w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-xl text-sm font-semibold bg-theme-surface border border-theme-border text-theme-primary hover:border-yellow-500/50 hover:text-yellow-500 transition-all shadow-sm shrink-0"
            >
              <i className="fas fa-trophy text-yellow-500" />
              <span className="hidden sm:inline">Leaderboard</span>
            </Link>
          </div>
        </div>

        {upcomingExams.length > 0 ? (
          <Section
            title="Upcoming Exams"
            icon="fa-calendar-alt"
            color="text-yellow-500"
            footer={upcomingPage.hasMore ? <LoadMoreButton loading={loadingMoreStatus.upcoming} onClick={() => loadMoreExams('upcoming')} label="Load More Upcoming Exams" /> : null}
          >
            {upcomingExams.map((exam, index) => (
              <ExamCard key={exam._id} exam={exam} badge="Upcoming" badgeColor="bg-yellow-500/10 text-yellow-500 border-yellow-500/20" fmtDate={fmtDate} disabled disabledLabel="Starts Soon" index={index} />
            ))}
          </Section>
        ) : null}

        <Section
          title="Live Exams"
          icon="fa-circle text-red-500 animate-pulse"
          color="text-red-500"
          footer={livePage.hasMore ? <LoadMoreButton loading={loadingMoreStatus.live} onClick={() => loadMoreExams('live')} label="Load More Live Exams" /> : null}
        >
          {liveExams.length === 0 ? (
            <p className="text-theme-secondary text-sm">No exams are live right now.</p>
          ) : liveExams.map((exam, index) => {
            const alreadyConsumed = consumedLiveIds.has(exam._id?.toString())
            const checkingLiveAccess = !isLoaded || liveAccessLoading
            return (
              <ExamCard
                key={exam._id}
                exam={exam}
                badge="LIVE"
                badgeColor="bg-red-500/10 text-red-500 border-red-500/20"
                fmtDate={fmtDate}
                onStart={() => handleTakeExam(exam._id)}
                disabled={checkingLiveAccess || alreadyConsumed}
                disabledLabel={checkingLiveAccess ? 'Checking...' : 'Attempt Used'}
                index={index}
              />
            )
          })}
        </Section>

        <Section
          title="Past Exams"
          icon="fa-history"
          color="text-theme-secondary"
          footer={pastPage.hasMore ? <LoadMoreButton loading={loadingMoreStatus.past} onClick={() => loadMoreExams('past')} label="Load More Past Exams" /> : null}
        >
          {pastExams.length === 0 ? (
            <p className="text-theme-secondary text-sm">No past exams yet.</p>
          ) : pastExams.map((exam, index) => (
            <ExamCard key={exam._id} exam={exam} badge="Practice" badgeColor="bg-theme-accent/10 text-theme-accent border border-theme-accent/20" fmtDate={fmtDate} onStart={() => handleTakeExam(exam._id)} index={index} />
          ))}
        </Section>
      </main>
    </div>
  )
}

function Section({ title, icon, color, children, footer = null }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center space-x-3">
        <i className={`fas ${icon} ${color} text-lg`} />
        <h2 className="text-2xl font-extrabold text-theme-primary">{title}</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">{children}</div>
      {footer}
    </section>
  )
}

function LoadMoreButton({ loading, onClick, label }) {
  return (
    <div className="flex justify-center">
      <button
        onClick={onClick}
        disabled={loading}
        className="px-5 py-3 rounded-xl bg-theme-surface border border-theme-border text-sm font-bold text-theme-secondary hover:text-theme-primary disabled:opacity-60"
      >
        {loading ? 'Loading...' : label}
      </button>
    </div>
  )
}

function ExamCard({ exam, badge, badgeColor, fmtDate, onStart, disabled, disabledLabel, index }) {
  return (
    <div className="card-enter bg-theme-surface border border-theme-border rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition-all" style={{ animationDelay: `${index * 80}ms` }}>
      <div>
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-theme-primary text-lg leading-snug">{exam.title}</h3>
          <span className={`text-xs font-bold px-2 py-1 rounded-full border flex-shrink-0 ml-2 ${badgeColor}`}>{badge}</span>
        </div>
        <div className="space-y-1 text-sm text-theme-secondary">
          <p><i className="fas fa-clock mr-2" />{exam.duration} min</p>
          {exam.liveStart ? <p><i className="fas fa-play-circle mr-2" />{fmtDate(exam.liveStart)}</p> : null}
          {exam.liveEnd ? <p><i className="fas fa-stop-circle mr-2" />{fmtDate(exam.liveEnd)}</p> : null}
        </div>
      </div>
      <button onClick={disabled ? undefined : onStart} disabled={disabled} className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${disabled ? 'bg-theme-bg text-theme-secondary cursor-not-allowed border border-theme-border' : 'bg-theme-accent text-white hover:opacity-90 shadow-md'}`}>
        {disabled ? disabledLabel || 'Unavailable' : 'Start Exam ->'}
      </button>
    </div>
  )
}

async function fetchExamPage(status, offset) {
  const params = new URLSearchParams({
    status,
    limit: String(EXAM_PAGE_SIZE),
    offset: String(offset),
  })
  const response = await fetch(`/api/exams?${params.toString()}`)
  const data = await response.json()
  if (!response.ok) throw new Error(data?.error || 'Failed to fetch exams')
  return normalizeExamPage(data, status)
}

function normalizeInitialExamPages(initialExamPages, initialExams) {
  if (hasExamPageData(initialExamPages)) {
    return Object.fromEntries(STATUS_LIST.map((status) => [status, normalizeExamPage(initialExamPages[status], status)]))
  }

  if (Array.isArray(initialExams)) {
    return splitLegacyExamArray(initialExams)
  }

  return Object.fromEntries(STATUS_LIST.map((status) => [status, emptyExamPage(status)]))
}

function normalizeExamPage(data, status) {
  if (Array.isArray(data)) {
    return {
      ...emptyExamPage(status),
      exams: data,
      totalCount: data.length,
      nextOffset: data.length,
      hasMore: false,
    }
  }

  const exams = Array.isArray(data?.exams) ? data.exams : []
  const offset = Number.isFinite(Number(data?.offset)) ? Number(data.offset) : 0
  return {
    status,
    exams,
    totalCount: Number.isFinite(Number(data?.totalCount)) ? Number(data.totalCount) : exams.length,
    limit: Number.isFinite(Number(data?.limit)) ? Number(data.limit) : EXAM_PAGE_SIZE,
    offset,
    nextOffset: Number.isFinite(Number(data?.nextOffset)) ? Number(data.nextOffset) : offset + exams.length,
    hasMore: Boolean(data?.hasMore),
  }
}

function splitLegacyExamArray(exams) {
  const now = new Date()
  const pages = Object.fromEntries(STATUS_LIST.map((status) => [status, emptyExamPage(status)]))

  for (const exam of exams) {
    const status = getExamStatus(exam, now)
    if (!status) continue
    pages[status].exams.push(exam)
  }

  for (const status of STATUS_LIST) {
    pages[status] = {
      ...pages[status],
      totalCount: pages[status].exams.length,
      nextOffset: pages[status].exams.length,
    }
  }

  return pages
}

function getExamStatus(exam, now) {
  const liveStart = exam.liveStart ? new Date(exam.liveStart) : null
  const liveEnd = exam.liveEnd ? new Date(exam.liveEnd) : null
  if (liveStart && liveEnd && now >= liveStart && now <= liveEnd) return 'live'
  if (liveStart && now < liveStart) return 'upcoming'
  if (liveEnd && now > liveEnd) return 'past'
  return null
}

function hasExamPageData(value) {
  return STATUS_LIST.some((status) => Array.isArray(value?.[status]?.exams))
}

function emptyExamPage(status = '') {
  return { status, exams: [], totalCount: 0, limit: EXAM_PAGE_SIZE, offset: 0, nextOffset: 0, hasMore: false }
}

function mergeExams(current = [], next = []) {
  const seen = new Set(current.map((exam) => exam._id))
  const merged = [...current]
  for (const exam of next) {
    if (!exam?._id || seen.has(exam._id)) continue
    seen.add(exam._id)
    merged.push(exam)
  }
  return merged
}
