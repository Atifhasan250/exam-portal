'use client'

import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useTheme } from '@/context/ThemeContext'
import PageSkeleton from '@/components/PageSkeleton'
import AuthCallout from '@/components/AuthCallout'
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

export default function ExamPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [screen, setScreen] = useState('setup')
  const [answers, setAnswers] = useState({})
  const answersRef = useRef(answers)
  const [timeLeft, setTimeLeft] = useState(0)
  const [result, setResult] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState({ show: false, text: '' })
  const [lastSelected, setLastSelected] = useState({})
  const timerRef = useRef(null)
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const { user, isLoaded } = hasClerk ? useUser() : { user: null, isLoaded: true }

  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { window.scrollTo(0, 0) }, [screen])

  useEffect(() => {
    fetch(`/api/exams/${id}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
          return
        }
        setExam(data)
        setTimeLeft(data.duration * 60)
      })
      .catch(() => setError('Failed to load exam'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    if (screen !== 'exam') return undefined

    const handleVisibilityChange = () => {
      if (document.hidden) {
        showToast('Tab switch detected. Submitting exam...')
        setTimeout(() => submitExam(), 3500)
      }
    }

    // Auto-submit when the browser tab/window is closed
    const handleBeforeUnload = (event) => {
      event.preventDefault()
      submitExam()
    }

    const blockContext = (event) => event.preventDefault()
    const blockKeys = (event) => {
      if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'p', 'a', 's', 'u'].includes(event.key.toLowerCase())) {
        event.preventDefault()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('contextmenu', blockContext)
    document.addEventListener('keydown', blockKeys)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('contextmenu', blockContext)
      document.removeEventListener('keydown', blockKeys)
    }
  }, [screen])

  const showToast = (text) => {
    setToast({ show: true, text })
    setTimeout(() => setToast({ show: false, text: '' }), 3500)
  }

  const startExam = () => {
    if (hasClerk && !user) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(`/exam/${id}`)}`)
      return
    }

    setScreen('exam')
    timerRef.current = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timerRef.current)
          submitExam()
          return 0
        }
        return previous - 1
      })
    }, 1000)
  }

  const submitExam = async () => {
    if (submitting) return
    if (hasClerk && !user) return

    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)
    setModalOpen(false)
    setScreen('result')

    try {
      const response = await fetch(`/api/exams/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: answersRef.current,
          studentName:
            user?.fullName ||
            [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
            user?.username ||
            user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
            'Student',
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setResult(null)
        setError(data.error || 'Failed to submit exam')
        return
      }
      setResult({ ...data, answers: answersRef.current })
    } catch {
      setResult(null)
    } finally {
      setSubmitting(false)
    }
  }

  const saveAnswer = (questionIndex, optionIndex) => {
    if (answers[questionIndex] !== undefined) return
    setAnswers((previous) => ({ ...previous, [questionIndex]: optionIndex }))
    setLastSelected((previous) => ({ ...previous, [questionIndex]: optionIndex }))
  }

  if (!isLoaded || loading) return <PageSkeleton />
  if (hasClerk && !user) {
    return (
      <div className="bg-theme-bg min-h-screen py-20 px-4">
        <AuthCallout title="Sign in to take this exam" description="Exam submissions are now tied to your IT Resource Zone account so your results and live attempt limits are enforced securely." />
      </div>
    )
  }
  if (error && !result) return <ErrorScreen message={error} onBack={() => router.push('/')} />

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')
  const pulse = timeLeft <= 60
  const studentName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    'Student'

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme">
      <header className="bg-theme-surface border-b border-theme-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <Image src="/favicon.png" alt="Logo" width={32} height={32} className="object-contain shrink-0" />
            <span className="font-bold text-theme-primary truncate text-sm sm:text-base">{exam?.title}</span>
          </Link>
          <div className="flex items-center space-x-3">
            <button onClick={toggleTheme} className="w-9 h-9 rounded-full flex items-center justify-center bg-theme-bg text-theme-secondary border border-theme-border hover:text-theme-primary transition-all">
              <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
            </button>
            {screen === 'exam' ? (
              <div className={`font-mono text-base font-bold px-3 py-1 rounded-full border ${pulse ? 'timer-danger bg-theme-error-bg text-theme-error-text border-theme-error-border' : 'bg-indigo-50 dark:bg-indigo-500/10 text-theme-accent border-indigo-200 dark:border-indigo-500/20'}`}>
                {mins}:{secs}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {screen !== 'exam' ? (
          <div className="mb-6">
            <Link href="/" className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all shadow-sm">
              <i className="fas fa-arrow-left" />
            </Link>
          </div>
        ) : null}

        {screen === 'setup' ? (
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-3xl font-extrabold text-theme-primary mb-2">{exam.title}</h2>
              <p className="text-theme-secondary">Signed in as <span className="font-semibold text-theme-primary">{studentName}</span></p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: 'fa-clock', label: 'Duration', val: `${exam.duration} Minutes` },
                { icon: 'fa-question-circle', label: 'Questions', val: exam.questions?.length || 0 },
                { icon: 'fa-lock', label: 'Answers', val: 'Cannot be changed once selected' },
                { icon: 'fa-shield-alt', label: 'Auto-Submit', val: 'Tab switch or browser close will submit your exam', warn: true },
              ].map((item) => (
                <div key={item.label} className={`bg-theme-bg border rounded-xl p-4 flex items-start space-x-3 ${item.warn ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-theme-border'}`}>
                  <i className={`fas ${item.icon} mt-0.5 ${item.warn ? 'text-yellow-500' : 'text-theme-accent'}`} />
                  <div><p className={`font-semibold text-sm ${item.warn ? 'text-yellow-600 dark:text-yellow-400' : 'text-theme-primary'}`}>{item.label}</p><p className="text-theme-secondary text-sm">{item.val}</p></div>
                </div>
              ))}
            </div>
            <button onClick={startExam} className="w-full bg-theme-accent text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all flex items-center justify-center space-x-2 shadow-lg">
              <span>Begin Examination</span><i className="fas fa-arrow-right text-sm" />
            </button>
          </div>
        ) : null}

        {screen === 'exam' ? (
          <div className="space-y-6">
            {exam.questions.map((question, questionIndex) => {
              const hasAnswered = answers[questionIndex] !== undefined
              return (
                <div key={questionIndex} className="bg-theme-surface border border-theme-border rounded-2xl p-4 sm:p-6 shadow-sm">
                  <div className="flex items-start space-x-3 sm:space-x-4 mb-4 sm:mb-5">
                    <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-theme-bg flex items-center justify-center font-bold text-theme-secondary text-xs sm:text-sm">{questionIndex + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm sm:text-base font-bold text-theme-primary leading-relaxed [&_p]:m-0 [&_p]:inline" dangerouslySetInnerHTML={{ __html: safeHTML(question.question) }} />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:gap-3">
                    {question.options.map((option, optionIndex) => {
                      const selected = answers[questionIndex] === optionIndex
                      let classes = 'group flex items-center p-3 sm:p-4 rounded-xl border transition-all duration-200 '
                      classes += hasAnswered
                        ? selected ? 'border-theme-accent bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-theme-accent cursor-default' : 'border-theme-border bg-theme-surface opacity-50 cursor-default'
                        : selected ? 'border-theme-accent bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-theme-accent cursor-pointer' : 'border-theme-border bg-theme-surface hover:border-indigo-300 dark:hover:border-indigo-500/50 cursor-pointer hover:shadow-md'
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
                          <span className={`ml-2 sm:ml-3 text-sm sm:text-base leading-snug [&_p]:m-0 [&_p]:inline ${selected ? 'text-theme-primary font-bold' : 'text-theme-secondary font-medium'}`} dangerouslySetInnerHTML={{ __html: safeHTML(option) }} />
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <div className="flex justify-center pt-4 pb-10">
              <button onClick={() => setModalOpen(true)} className="bg-theme-success-text hover:opacity-90 text-white font-bold py-4 px-14 rounded-xl shadow-lg transition-all">
                Submit Exam
              </button>
            </div>
          </div>
        ) : null}

        {screen === 'result' && result ? (
          <ResultScreen result={result} studentName={studentName} examId={id} onBack={() => router.push('/')} />
        ) : null}
        {screen === 'result' && !result ? (
          <div className="text-center py-20 text-theme-secondary">Calculating results…</div>
        ) : null}
      </main>

      {modalOpen ? (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 max-w-sm w-full shadow-2xl modal-panel">
            <h3 className="text-xl font-bold text-theme-primary mb-3">Submit Exam?</h3>
            <p className="text-theme-secondary mb-6 text-sm">You won&apos;t be able to change your answers afterward.</p>
            <div className="flex space-x-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-3 border border-theme-border text-theme-primary rounded-xl hover:bg-theme-bg font-semibold transition-all">Cancel</button>
              <button onClick={submitExam} disabled={submitting} className="flex-1 py-3 bg-theme-accent text-white rounded-xl hover:opacity-90 font-semibold transition-all disabled:opacity-60">
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

  return (
    <div className="space-y-6 text-center">
      <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 md:p-12 shadow-sm">
        <div className="mb-6">
          {percentage >= 70 ? <i className="fas fa-check-circle text-7xl text-theme-success-text" /> : percentage >= 40 ? <i className="fas fa-info-circle text-7xl text-yellow-500" /> : <i className="fas fa-times-circle text-7xl text-theme-error-text" />}
        </div>
        <h2 className="text-3xl font-bold text-theme-primary mb-1">Exam Completed!</h2>
        <p className="text-theme-secondary mb-8">Results for: <span className="font-semibold text-theme-primary">{studentName}</span></p>
        <div className="inline-block bg-theme-bg border border-theme-border rounded-2xl px-10 py-6 mb-6">
          <p className="text-xs uppercase tracking-widest text-theme-secondary font-bold mb-1">Your Score</p>
          <p className="text-6xl font-black text-theme-accent">{displayScore}<span className="text-3xl text-theme-secondary">/{result.total}</span></p>
        </div>
        <div className="mb-8">
          <Link href={`/leaderboard/${examId}`} className="inline-flex items-center space-x-2 text-theme-accent hover:text-theme-primary transition-colors font-bold bg-indigo-500/10 hover:bg-indigo-500/20 px-6 py-3 rounded-xl">
            <span>See leaderboard</span>
            <i className="fas fa-arrow-right" />
          </Link>
        </div>
        <div className="text-left space-y-4 mt-8">
          <h3 className="text-xl font-bold text-theme-primary border-b border-theme-border pb-3">Answer Review</h3>
          {result.questions.map((question, index) => {
            const userAnswer = result.answers ? result.answers[index] : undefined
            const isCorrect = userAnswer === question.correct
            return (
              <div key={index} className={`p-5 rounded-2xl border ${isCorrect ? 'bg-theme-success-bg border-theme-success-border' : 'bg-theme-error-bg border-theme-error-border'}`}>
                <div className="font-bold text-theme-primary mb-4 text-sm sm:text-base leading-relaxed [&_p]:m-0 [&_p]:inline" dangerouslySetInnerHTML={{ __html: safeHTML(`${index + 1}. ${question.question}`) }} />
                <div className="text-sm space-y-2.5">
                  <p className={`${isCorrect ? 'text-theme-success-text' : 'text-theme-error-text'} font-semibold`}>
                    Your answer: {userAnswer !== undefined ? <span className="font-medium [&_p]:m-0 [&_p]:inline" dangerouslySetInnerHTML={{ __html: safeHTML(question.options[userAnswer]) }} /> : <i>Not answered</i>}
                  </p>
                  {!isCorrect ? <div className="text-theme-success-text font-semibold">Correct: <span className="font-medium [&_p]:m-0 [&_p]:inline" dangerouslySetInnerHTML={{ __html: safeHTML(question.options[question.correct]) }} /></div> : null}
                  {question.explanation ? <div className="text-theme-secondary mt-4 text-xs sm:text-sm border-t border-theme-border pt-3 leading-relaxed [&_p]:m-0 [&_p]:inline"><i className="fas fa-lightbulb mr-1.5 text-yellow-500" /><span dangerouslySetInnerHTML={{ __html: safeHTML(question.explanation) }} /></div> : null}
                </div>
              </div>
            )
          })}
        </div>
        <button onClick={onBack} className="mt-10 text-theme-secondary hover:text-theme-primary flex items-center justify-center mx-auto space-x-2 transition-colors text-sm">
          <i className="fas fa-arrow-left" /><span>Back to Home</span>
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
      <button onClick={onBack} className="text-theme-accent underline text-sm">← Back to Home</button>
    </div>
  )
}
