'use client'

import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import posthog from 'posthog-js'
import PageSkeleton from '@/components/PageSkeleton'
import AuthCallout from '@/components/AuthCallout'
import QuestionReviewCard from '@/components/QuestionReviewCard'
import { safeHTML } from '@/utils/sanitize'

function useCountUp(target, duration = 900) {
  const [current, setCurrent] = useState(0)
  useEffect(() => {
    if (target === 0) {
      setCurrent(0)
      return
    }
    let raf
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return current
}

export default function ExamPageClient({ params, initialExam = null }) {
  const { id } = use(params)
  const router = useRouter()
  const [exam, setExam] = useState(initialExam)
  const [loading, setLoading] = useState(!initialExam)
  const [error, setError] = useState('')
  const [screen, setScreen] = useState('setup')
  const [answers, setAnswers] = useState({})
  const answersRef = useRef(answers)
  const [timeLeft, setTimeLeft] = useState(0)
  const [result, setResult] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitState, setSubmitState] = useState('idle')
  const [submitError, setSubmitError] = useState('')
  const submittingRef = useRef(false) // ref guard prevents race condition double-submit
  const startingRef = useRef(false)
  const lastSubmitOptionsRef = useRef({ reason: 'manual-submit' })
  const [toast, setToast] = useState({ show: false, text: '' })
  const [lastSelected, setLastSelected] = useState({})
  const timerRef = useRef(null)
  const attemptIdRef = useRef(null)
  const practiceAttemptIdRef = useRef(null)
  const pendingAnswerRef = useRef(new Set())
  const { user, isLoaded } = useUser()

  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { window.scrollTo(0, 0) }, [screen])

  useEffect(() => {
    let active = true
    fetch(`/api/exams/${id}`)
      .then((response) => response.json())
      .then((data) => {
        if (!active) return
        if (data.error) {
          if (!initialExam) setError(data.error)
          return
        }
        setExam(data)
        setTimeLeft(data.duration * 60)
      })
      .catch(() => {
        if (!initialExam) setError('Failed to load exam')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [id, initialExam])

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    if (screen !== 'exam') return undefined
    window.history.pushState({ examLocked: true }, '', window.location.href)

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordAttemptEvent('visibility-hidden')
        showToast('Tab switch detected. Submitting exam...')
        setTimeout(() => submitExam({ reason: 'visibility-hidden' }), 3500)
      }
    }

    const handleBeforeUnload = () => {
      recordAttemptEvent('beforeunload', true)
      submitExamBeacon({ reason: 'beforeunload' })
    }

    const handleBackNavigation = () => {
      window.history.pushState({ examLocked: true }, '', window.location.href)
      showToast('Back navigation detected. Submitting exam...')
      submitExam({ reason: 'browser-back', redirectTo: '/exams' })
    }

    const blockContext = (event) => event.preventDefault()
    const blockKeys = (event) => {
      if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'p', 'a', 's', 'u'].includes(event.key.toLowerCase())) {
        event.preventDefault()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)
    window.addEventListener('popstate', handleBackNavigation)
    document.addEventListener('contextmenu', blockContext)
    document.addEventListener('keydown', blockKeys)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
      window.removeEventListener('popstate', handleBackNavigation)
      document.removeEventListener('contextmenu', blockContext)
      document.removeEventListener('keydown', blockKeys)
    }
  }, [screen])

  const showToast = (text) => {
    setToast({ show: true, text })
    setTimeout(() => setToast({ show: false, text: '' }), 3500)
  }

  const startExam = async () => {
    if (!isLoaded) return

    if (!user) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(`/exam/${id}`)}`)
      return
    }

    if (startingRef.current) return
    startingRef.current = true
    setSubmitting(true)
    setSubmitState('idle')
    setSubmitError('')
    try {
      if (exam.requiresAttempt) {
        const response = await fetch(`/api/exams/${id}/attempts/start`, { method: 'POST' })
        const data = await response.json()
        if (!response.ok) {
          setError(data.error || 'Failed to start exam attempt')
          return
        }

        attemptIdRef.current = data.attemptId
        const serverAnswers = data.answers && typeof data.answers === 'object' ? data.answers : {}
        setAnswers(serverAnswers)
        answersRef.current = serverAnswers
        setLastSelected({})
        setExam((previous) => ({ ...previous, questions: data.questions || [] }))
        if (data.expiresAt) {
          setTimeLeft(Math.max(1, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000)))
        }
      } else {
        const response = await fetch(`/api/exams/${id}/practice-attempts/start`, { method: 'POST' })
        const data = await response.json()
        if (!response.ok) {
          setError(data.error || 'Failed to start practice attempt')
          return
        }
        practiceAttemptIdRef.current = data.practiceAttemptId || null
      }
    } catch {
      setError('Failed to start attempt')
      return
    } finally {
      startingRef.current = false
      setSubmitting(false)
    }

    posthog.capture('exam_started', {
      exam_id: id,
      exam_title: exam.title,
      exam_type: exam.requiresAttempt ? 'live' : 'practice',
      question_count: exam.questions?.length ?? exam.questionCount,
    })
    setScreen('exam')
    timerRef.current = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timerRef.current)
          submitExam({ reason: 'timer-expired' })
          return 0
        }
        return previous - 1
      })
    }, 1000)
  }

  const recordAttemptEvent = (type, beacon = false) => {
    const attemptId = attemptIdRef.current
    if (!attemptId) return
    const url = `/api/exams/${id}/attempts/${attemptId}/events`
    const payload = JSON.stringify({ type, occurredAt: new Date().toISOString() })
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))
      return
    }
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  }

  const buildSubmitPayload = () => JSON.stringify({
    answers: answersRef.current,
    attemptId: attemptIdRef.current || undefined,
    practiceAttemptId: practiceAttemptIdRef.current || undefined,
  })

  const submitExamBeacon = ({ reason = 'beforeunload' } = {}) => {
    if (!user || !navigator.sendBeacon) return
    const payload = buildSubmitPayload()
    navigator.sendBeacon(
      `/api/exams/${id}/submit`,
      new Blob([payload], { type: 'application/json' }),
    )
    posthog.capture('exam_auto_submitted', {
      exam_id: id,
      reason,
      transport: 'beacon',
    })
  }

  const submitExam = async ({ reason = 'manual-submit', redirectTo = '' } = {}) => {
    // useRef guard prevents race condition: timer expiry + tab-switch firing
    // simultaneously can both pass the state check before React re-renders
    if (submittingRef.current) return
    if (!user) return
    submittingRef.current = true
    lastSubmitOptionsRef.current = { reason, redirectTo }
    setSubmitState('submitting')
    setSubmitError('')

    if (reason === 'manual-submit') {
      posthog.capture('exam_submitted', {
        exam_id: id,
        answers_count: Object.keys(answersRef.current).length,
      })
    } else {
      posthog.capture('exam_auto_submitted', {
        exam_id: id,
        reason,
      })
    }
    recordAttemptEvent(reason, false)
    const payload = buildSubmitPayload()

    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)
    setModalOpen(false)

    try {
      const response = await fetch(`/api/exams/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: payload,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setResult(null)
        setSubmitState('failed')
        setSubmitError(data.error || 'Failed to submit exam')
        setScreen('submit-recovery')
        return
      }
      sessionStorage.removeItem('exams_cache')
      sessionStorage.removeItem('leaderboard_cache')
      setResult({ ...data, answers: answersRef.current })
      setSubmitState('success')
      setScreen('result')
      if (redirectTo) router.replace(redirectTo)
    } catch {
      setResult(null)
      setSubmitState('unknown')
      setSubmitError('Network error while submitting. Your answers are still available on this device.')
      setScreen('submit-recovery')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const saveAnswer = async (questionIndex, optionIndex) => {
    if (answers[questionIndex] !== undefined) return
    const pendingKey = String(questionIndex)
    if (pendingAnswerRef.current.has(pendingKey)) return

    if (attemptIdRef.current) {
      pendingAnswerRef.current.add(pendingKey)
      try {
        const response = await fetch(`/api/exams/${id}/attempts/${attemptIdRef.current}/answers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionIndex, optionIndex }),
        })
        const data = await response.json()
        if (!response.ok) {
          showToast(data.error || 'Could not lock answer.')
          return
        }
      } catch {
        showToast('Could not lock answer. Check your connection.')
        return
      } finally {
        pendingAnswerRef.current.delete(pendingKey)
      }
    }

    setAnswers((previous) => ({ ...previous, [questionIndex]: optionIndex }))
    setLastSelected((previous) => ({ ...previous, [questionIndex]: optionIndex }))
  }

  if (loading || !isLoaded) return <PageSkeleton />
  if (error && !result && screen !== 'submit-recovery') return <ErrorScreen message={error} onBack={() => router.push('/')} />

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')
  const pulse = timeLeft <= 60
  const studentName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    'Student'
  const questionCount = exam?.questionCount ?? exam?.questions?.length ?? 0
  const questionsReady = exam?.requiresAttempt || Array.isArray(exam?.questions)
  const beginDisabled = submitting || (!isLoaded || !user) || !questionsReady

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme">
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {screen !== 'exam' ? (
          <div className="mb-6">
            <Link href={screen === 'result' ? '/exams' : '/'} className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all shadow-sm">
              <i className="fas fa-arrow-left" />
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-6 bg-theme-surface border border-theme-border rounded-2xl px-5 py-3 shadow-sm">
            <span className="font-semibold text-theme-secondary text-sm truncate">{exam?.title}</span>
            <div className={`font-mono text-base font-bold px-3 py-1 rounded-full border ${pulse ? 'timer-danger bg-theme-error-bg text-theme-error-text border-theme-error-border' : 'bg-theme-accent/10 dark:bg-indigo-500/10 text-theme-accent border-theme-accent/20 dark:border-indigo-500/20'}`}>
              {mins}:{secs}
            </div>
          </div>
        )}

        {screen === 'setup' ? (
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 shadow-sm space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold text-theme-primary mb-2">{exam.title}</h1>
              <p className="text-theme-secondary">
                {user ? (
                  <>Signed in as <span className="font-semibold text-theme-primary">{studentName}</span></>
                ) : (
                  'Review the exam details, then sign in to start securely and save your result.'
                )}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: 'fa-clock', label: 'Duration', val: `${exam.duration} Minutes` },
                { icon: 'fa-question-circle', label: 'Questions', val: questionCount },
                { icon: 'fa-lock', label: 'Answers', val: 'Cannot be changed once selected' },
                exam.requiresAttempt
                  ? { icon: 'fa-user-check', label: 'Live Attempt', val: 'Begin counts as your one live attempt', warn: true }
                  : { icon: 'fa-redo', label: 'Practice Count', val: 'Every begin adds one practice attempt' },
                { icon: 'fa-shield-alt', label: 'Auto-Submit', val: 'Tab switch or browser close will submit your exam', warn: true },
              ].filter(Boolean).map((item) => (
                <div key={item.label} className={`bg-theme-bg border rounded-xl p-4 flex items-start space-x-3 ${item.warn ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-theme-border'}`}>
                  <i className={`fas ${item.icon} mt-0.5 ${item.warn ? 'text-yellow-500' : 'text-theme-accent'}`} />
                  <div><p className={`font-semibold text-sm ${item.warn ? 'text-yellow-600 dark:text-yellow-400' : 'text-theme-primary'}`}>{item.label}</p><p className="text-theme-secondary text-sm">{item.val}</p></div>
                </div>
              ))}
            </div>
            {!user && isLoaded ? (
              <AuthCallout
                title="Sign in to take this exam"
                description="Exam submissions are tied to your IT Resource Zone account so rankings, attempt limits, and score history stay accurate."
                href={`/sign-in?redirect_url=${encodeURIComponent(`/exam/${id}`)}`}
              />
            ) : null}
            <button onClick={startExam} disabled={beginDisabled} className="w-full bg-theme-accent text-theme-accent-text font-bold py-4 rounded-xl hover:opacity-90 transition-all flex items-center justify-center space-x-2 shadow-lg disabled:opacity-60">
              <span>{!user ? 'Sign In to Begin' : submitting ? 'Starting...' : questionsReady ? 'Begin Examination' : 'Loading Questions...'}</span><i className="fas fa-arrow-right text-sm" />
            </button>
          </div>
        ) : null}

        {screen === 'exam' ? (
          <div className="space-y-6 no-copy">
            {exam.questions.map((question, questionIndex) => {
              const hasAnswered = answers[questionIndex] !== undefined
              return (
                <div key={questionIndex} className="bg-theme-surface border border-theme-border rounded-2xl p-4 sm:p-6 shadow-sm">
                  <div className="flex items-start space-x-3 sm:space-x-4 mb-4 sm:mb-5">
                    <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-theme-bg flex items-center justify-center font-bold text-theme-secondary text-xs sm:text-sm">{questionIndex + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm sm:text-base font-bold text-theme-primary leading-relaxed whitespace-pre-wrap [&_p]:m-0 [&_p]:inline" dangerouslySetInnerHTML={{ __html: safeHTML(question.question) }} />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:gap-3">
                    {question.options.map((option, optionIndex) => {
                      const selected = answers[questionIndex] === optionIndex
                      let classes = 'group flex items-center p-3 sm:p-4 rounded-xl border transition-all duration-200 '
                      classes += hasAnswered
                        ? selected ? 'border-theme-accent bg-theme-accent/10 dark:bg-indigo-500/10 ring-1 ring-theme-accent cursor-default' : 'border-theme-border bg-theme-surface opacity-75 cursor-default'
                        : selected ? 'border-theme-accent bg-theme-accent/10 dark:bg-indigo-500/10 ring-1 ring-theme-accent cursor-pointer' : 'border-theme-border bg-theme-surface hover:border-theme-accent/45 dark:hover:border-indigo-500/50 cursor-pointer hover:shadow-md'
                      const dotClasses = selected ? 'border-theme-accent bg-theme-accent' : 'border-theme-border group-hover:border-theme-accent'

                      return (
                        <label key={optionIndex} className={`${classes} ${lastSelected[questionIndex] === optionIndex ? 'option-selected-anim' : ''}`} onClick={() => saveAnswer(questionIndex, optionIndex)} onAnimationEnd={() => setLastSelected((previous) => {
                          const next = { ...previous }
                          delete next[questionIndex]
                          return next
                        })}>
                          <div className={`flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-all ${dotClasses}`}>
                            {selected ? <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full scale-in-center" /> : null}
                          </div>
                          <span className={`ml-2 sm:ml-3 text-sm sm:text-base leading-snug whitespace-pre-wrap [&_p]:m-0 [&_p]:inline ${selected ? 'text-theme-primary font-bold' : 'text-exam-option font-semibold'}`} dangerouslySetInnerHTML={{ __html: safeHTML(option) }} />
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <div className="flex justify-center pt-4 pb-10">
              <button onClick={() => setModalOpen(true)} disabled={submitting} className="bg-theme-accent hover:opacity-90 text-theme-accent-text font-bold py-4 px-14 rounded-xl shadow-lg transition-all disabled:opacity-60">
                {submitting ? 'Submitting...' : 'Submit Exam'}
              </button>
            </div>
          </div>
        ) : null}

        {screen === 'result' && result ? (
          <ResultScreen result={result} studentName={studentName} examId={id} onBack={() => router.push('/exams')} />
        ) : null}
        {screen === 'submit-recovery' ? (
          <SubmitRecoveryScreen
            state={submitState}
            message={submitError}
            onRetry={() => submitExam(lastSubmitOptionsRef.current || { reason: 'manual-submit' })}
            onProfile={() => router.push('/profile')}
            onExams={() => router.push('/exams')}
          />
        ) : null}
        {screen === 'exam' && submitState === 'submitting' ? (
          <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 text-center shadow-2xl max-w-sm w-full">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-theme-border border-t-theme-accent animate-spin" />
              <p className="font-black text-theme-primary">Submitting exam...</p>
              <p className="text-sm text-theme-secondary mt-1">Keep this tab open until the result appears.</p>
            </div>
          </div>
        ) : null}
      </main>

      {modalOpen ? (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 max-w-sm w-full shadow-2xl modal-panel">
            <h3 className="text-xl font-bold text-theme-primary mb-3">Submit Exam?</h3>
            <p className="text-theme-secondary mb-6 text-sm">You won&apos;t be able to change your answers afterward.</p>
            <div className="flex space-x-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-3 border border-theme-border text-theme-primary rounded-xl hover:bg-theme-bg font-semibold transition-all">Cancel</button>
              <button onClick={() => submitExam()} disabled={submitting} className="flex-1 py-3 bg-theme-accent text-theme-accent-text rounded-xl hover:opacity-90 font-semibold transition-all disabled:opacity-60">
                {submitting ? 'Submitting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-theme-error-text text-white p-4 rounded-2xl shadow-xl transition-all duration-300 z-[200] flex items-start space-x-3 ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
        <i className="fas fa-exclamation-circle mt-0.5 flex-shrink-0" />
        <div><p className="font-bold text-sm">Security Alert</p><p className="text-xs text-red-100">{toast.text}</p></div>
      </div>
    </div>
  )
}

function ResultScreen({ result, studentName, examId, onBack }) {
  const percentage = (result.score / result.total) * 100
  const displayScore = useCountUp(result.score, 900)
  const [filter, setFilter] = useState('all')
  const questions = Array.isArray(result.questions) ? result.questions : []
  const reviewAvailable = result.reviewAvailable !== false
  const reviewAvailableAt = result.reviewAvailableAt
    ? new Date(result.reviewAvailableAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : null

  const filteredQuestions = questions
    .map((question, index) => {
      const userAnswer = result.answers ? result.answers[index] : undefined
      const isCorrect = userAnswer === question.correct
      return { question, index, userAnswer, isCorrect }
    })
    .filter(({ isCorrect }) => {
      if (filter === 'right') return isCorrect
      if (filter === 'wrong') return !isCorrect
      return true
    })

  return (
    <div className="space-y-6">
      <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 shadow-sm text-center">
        <div className="mb-4">
          {percentage >= 70 ? <i className="fas fa-check-circle text-6xl text-theme-success-text" /> : percentage >= 40 ? <i className="fas fa-info-circle text-6xl text-yellow-500" /> : <i className="fas fa-times-circle text-6xl text-theme-error-text" />}
        </div>
        <h2 className="text-2xl font-extrabold text-theme-primary mb-1">Exam Completed!</h2>
        <p className="text-theme-secondary text-sm mb-6">Results for: <span className="font-semibold text-theme-primary">{studentName}</span></p>
        <div className="inline-flex items-end gap-1 bg-theme-bg border border-theme-border rounded-2xl px-10 py-5 mb-6">
          <p className="text-6xl font-black text-theme-accent leading-none">{displayScore}</p>
          <p className="text-2xl font-bold text-theme-secondary mb-1">/{result.total}</p>
        </div>
        <div>
          <Link href={`/leaderboard/${examId}`} onClick={() => posthog.capture('leaderboard_link_clicked', { exam_id: examId, score: result.score, total: result.total })} className="inline-flex items-center space-x-2 text-theme-accent hover:text-theme-primary transition-colors font-bold bg-theme-accent/10 hover:bg-theme-accent/20 px-6 py-3 rounded-xl">
            <span>See leaderboard</span>
            <i className="fas fa-arrow-right" />
          </Link>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-theme-primary">Answer Review</h3>
          {reviewAvailable && questions.length > 0 ? (
            <div className="flex bg-theme-surface border border-theme-border rounded-xl p-1 gap-1">
              {['all', 'right', 'wrong'].map((value) => (
                <button key={value} onClick={() => setFilter(value)} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${filter === value ? value === 'right' ? 'bg-theme-success-bg text-theme-success-text' : value === 'wrong' ? 'bg-theme-error-bg text-theme-error-text' : 'bg-theme-bg border border-theme-border text-theme-primary' : 'text-theme-secondary hover:text-theme-primary'}`}>
                  {value}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-4">
          {!reviewAvailable ? (
            <div className="text-center py-10 bg-theme-surface border border-theme-border rounded-2xl text-theme-secondary">
              <i className="fas fa-lock text-4xl mb-3 opacity-40" />
              <p className="font-semibold text-theme-primary">Answer review is hidden while the live exam is active.</p>
              <p className="text-sm mt-1">
                {reviewAvailableAt ? `It will be available after ${reviewAvailableAt}.` : 'It will be available after the live exam ends.'}
              </p>
              {result.submissionId ? (
                <Link href={`/profile/submission/${result.submissionId}`} className="inline-flex items-center gap-2 mt-4 text-theme-accent hover:text-theme-primary font-bold text-sm transition-colors">
                  <span>Open result details</span>
                  <i className="fas fa-arrow-right" />
                </Link>
              ) : null}
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-10 bg-theme-surface border border-theme-border rounded-2xl text-theme-secondary">
              <i className="fas fa-folder-open text-4xl mb-3 opacity-40" />
              <p>No questions for this filter.</p>
            </div>
          ) : filteredQuestions.map(({ question, index, userAnswer }) => (
            <QuestionReviewCard key={index} question={question} index={index} userAnswer={userAnswer} />
          ))}
        </div>
      </div>

      <button onClick={onBack} className="text-theme-secondary hover:text-theme-primary flex items-center justify-center mx-auto space-x-2 transition-colors text-sm pb-6">
        <i className="fas fa-arrow-left" /><span>Back to Exams</span>
      </button>
    </div>
  )
}

function SubmitRecoveryScreen({ state, message, onRetry, onProfile, onExams }) {
  const isUnknown = state === 'unknown'
  return (
    <div className="max-w-xl mx-auto bg-theme-surface border border-theme-border rounded-2xl p-8 shadow-sm text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-theme-error-bg text-theme-error-text flex items-center justify-center mb-5">
        <i className={`fas ${isUnknown ? 'fa-wifi' : 'fa-triangle-exclamation'} text-3xl`} />
      </div>
      <h2 className="text-2xl font-black text-theme-primary mb-2">
        {isUnknown ? 'Submission status unknown' : 'Submission failed'}
      </h2>
      <p className="text-theme-secondary mb-6">
        {message || 'Your result could not be confirmed. Your answers are still saved in this tab for retry.'}
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        <button onClick={onRetry} className="px-4 py-3 rounded-xl bg-theme-accent text-theme-accent-text font-bold inline-flex items-center justify-center gap-2">
          <i className="fas fa-rotate-right" />
          Retry
        </button>
        <button onClick={onProfile} className="px-4 py-3 rounded-xl bg-theme-bg border border-theme-border text-theme-primary font-bold inline-flex items-center justify-center gap-2">
          <i className="fas fa-clock-rotate-left" />
          Profile History
        </button>
        <button onClick={onExams} className="px-4 py-3 rounded-xl bg-theme-bg border border-theme-border text-theme-primary font-bold inline-flex items-center justify-center gap-2">
          <i className="fas fa-layer-group" />
          Back to Exams
        </button>
      </div>
    </div>
  )
}

function ErrorScreen({ message, onBack }) {
  return (
    <div className="min-h-screen bg-theme-bg flex flex-col items-center justify-center space-y-4 text-theme-primary px-6 text-center">
      <i className="fas fa-exclamation-triangle text-4xl text-theme-error-text" />
      <p className="font-bold text-xl max-w-sm">{message}</p>
      <button onClick={onBack} className="text-theme-accent underline text-sm">&larr; Back to Home</button>
    </div>
  )
}
