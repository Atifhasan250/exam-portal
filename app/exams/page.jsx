'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import Navbar from '@/components/Navbar'

export default function ExamsPage() {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [submittedLiveIds, setSubmittedLiveIds] = useState(new Set())
  const [now, setNow] = useState(new Date())
  const router = useRouter()
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const { user } = hasClerk ? useUser() : { user: null }

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const cached = sessionStorage.getItem('exams_cache')
    if (cached) {
      setExams(JSON.parse(cached))
      setLoading(false)
    }

    fetch('/api/exams')
      .then((response) => response.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : []
        setExams(items)
        sessionStorage.setItem('exams_cache', JSON.stringify(items))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Fetch exam IDs where this user has already submitted a live attempt
  useEffect(() => {
    if (!user?.id) return
    fetch(`/api/submissions/user/${encodeURIComponent(user.id)}/live`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSubmittedLiveIds(new Set(data))
        }
      })
      .catch(() => {})
  }, [user?.id])

  const isLive = (exam) => exam.liveStart && exam.liveEnd && now >= new Date(exam.liveStart) && now <= new Date(exam.liveEnd)
  const isPast = (exam) => exam.liveEnd && now > new Date(exam.liveEnd)
  const isUpcoming = (exam) => exam.liveStart && now < new Date(exam.liveStart)
  const fmtDate = (date) => new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

  const handleTakeExam = (examId) => {
    if (hasClerk && !user) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(`/exam/${examId}`)}`)
      return
    }
    router.push(`/exam/${examId}`)
  }

  const liveExams = exams.filter(isLive)
  const pastExams = exams.filter(isPast)
  const upcomingExams = exams.filter(isUpcoming)

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme page-enter">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-14">
        <div className="flex items-center space-x-3">
          <Link href="/" className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all">
            <i className="fas fa-arrow-left" />
          </Link>
          <h2 className="text-3xl font-extrabold text-theme-primary">All Exams</h2>
        </div>

        {loading ? (
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
        ) : (
          <>
            {upcomingExams.length > 0 ? (
              <Section title="Upcoming Exams" icon="fa-calendar-alt" color="text-yellow-500">
                {upcomingExams.map((exam, index) => (
                  <ExamCard key={exam._id} exam={exam} badge="Upcoming" badgeColor="bg-yellow-500/10 text-yellow-500 border-yellow-500/20" fmtDate={fmtDate} disabled disabledLabel="Starts Soon" index={index} />
                ))}
              </Section>
            ) : null}

            <Section title="Live Exams" icon="fa-circle text-red-500 animate-pulse" color="text-red-500">
              {liveExams.length === 0 ? (
                <p className="text-theme-secondary text-sm">No exams are live right now.</p>
              ) : liveExams.map((exam, index) => {
                const alreadySubmitted = submittedLiveIds.has(exam._id?.toString())
                return (
                  <ExamCard
                    key={exam._id}
                    exam={exam}
                    badge="LIVE"
                    badgeColor="bg-red-500/10 text-red-500 border-red-500/20"
                    fmtDate={fmtDate}
                    onStart={() => handleTakeExam(exam._id)}
                    disabled={alreadySubmitted}
                    disabledLabel="Exam Submitted ✓"
                    index={index}
                  />
                )
              })}
            </Section>

            <Section title="Past Exams" icon="fa-history" color="text-theme-secondary">
              {pastExams.length === 0 ? (
                <p className="text-theme-secondary text-sm">No past exams yet.</p>
              ) : pastExams.map((exam, index) => (
                <ExamCard key={exam._id} exam={exam} badge="Practice" badgeColor="bg-theme-accent/10 text-theme-accent border border-theme-accent/20" fmtDate={fmtDate} onStart={() => handleTakeExam(exam._id)} index={index} />
              ))}
            </Section>
          </>
        )}
      </main>
    </div>
  )
}

function Section({ title, icon, color, children }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center space-x-3">
        <i className={`fas ${icon} ${color} text-lg`} />
        <h2 className="text-2xl font-extrabold text-theme-primary">{title}</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">{children}</div>
    </section>
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
        {disabled ? disabledLabel || 'Unavailable' : 'Start Exam →'}
      </button>
    </div>
  )
}
