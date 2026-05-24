'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PageLoadingOverlay from '@/components/PageLoadingOverlay'
import QuestionReviewCard from '@/components/QuestionReviewCard'

export default function SubmissionDetails({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch(`/api/submissions/details/${id}`)
      .then((response) => response.json())
      .then((result) => {
        if (result.error) setError(result.error)
        else setData(result)
      })
      .catch(() => setError('Failed to load submission details'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <PageLoadingOverlay>
        <div className="bg-theme-bg min-h-screen text-theme-primary pb-20">
          <div className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
            <div className="skeleton h-10 w-64 rounded-xl" />
            <div className="skeleton h-32 w-full rounded-2xl" />
            <div className="space-y-4">
              {[0, 1, 2].map((item) => <div key={item} className="skeleton h-48 w-full rounded-2xl" />)}
            </div>
          </div>
        </div>
      </PageLoadingOverlay>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-theme-bg flex flex-col items-center justify-center space-y-4 text-theme-primary px-6 text-center">
        <i className="fas fa-exclamation-triangle text-4xl text-theme-error-text" />
        <p className="font-bold text-xl">{error}</p>
        <button onClick={() => router.push('/profile')} className="text-theme-accent underline text-sm">← Back to Profile</button>
      </div>
    )
  }

  const { submission, questions, reviewAvailable } = data
  const reviewQuestions = Array.isArray(questions) ? questions : []
  const percentage = (submission.score / submission.total) * 100

  const filteredQuestions = reviewQuestions
    .map((question, index) => {
      const userAnswer = submission.answers ? submission.answers[index] : undefined
      const isCorrect = userAnswer === question.correct
      return { question, index, userAnswer, isCorrect }
    })
    .filter((item) => {
      if (filter === 'right') return item.isCorrect
      if (filter === 'wrong') return !item.isCorrect
      return true
    })

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme pb-20 page-enter">
      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <Link href="/profile" className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all">
            <i className="fas fa-arrow-left" />
          </Link>
          <h2 className="text-2xl font-extrabold text-theme-primary truncate">{submission.examId?.title || 'Exam Details'}</h2>
        </div>

        {/* Score card */}
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 shadow-sm text-center">
          <div className="mb-3">
            {percentage >= 70 ? <i className="fas fa-check-circle text-6xl text-theme-success-text" /> : percentage >= 40 ? <i className="fas fa-info-circle text-6xl text-yellow-500" /> : <i className="fas fa-times-circle text-6xl text-theme-error-text" />}
          </div>
          <div className="inline-flex items-end gap-1 bg-theme-bg border border-theme-border rounded-2xl px-10 py-5 mb-3">
            <p className="text-5xl font-black text-theme-accent leading-none">{submission.score}</p>
            <p className="text-2xl font-bold text-theme-secondary mb-1">/{submission.total}</p>
          </div>
          <p className={`font-bold text-sm ${percentage >= 70 ? 'text-theme-success-text' : percentage >= 40 ? 'text-yellow-500' : 'text-theme-error-text'}`}>{percentage.toFixed(0)}%</p>
          {!submission.wasLive && submission.attemptCount > 1 ? (
            <p className="text-xs font-bold text-theme-secondary mt-2">
              Best practice result across {submission.attemptCount} attempts
            </p>
          ) : null}
        </div>

        {/* Question review */}
        {submission.answers ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-theme-primary">Answer Review</h3>
              {reviewAvailable && reviewQuestions.length > 0 ? (
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
                  <p className="text-sm mt-1">Check this page again after the live exam ends.</p>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="text-center py-10 bg-theme-surface border border-theme-border rounded-2xl text-theme-secondary">
                  <i className="fas fa-folder-open text-4xl mb-3 opacity-40" />
                  <p>No questions found for this filter.</p>
                </div>
              ) : filteredQuestions.map(({ question, index, userAnswer }) => (
                <QuestionReviewCard key={index} question={question} index={index} userAnswer={userAnswer} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-theme-surface border border-theme-border rounded-2xl shadow-sm">
            <i className="fas fa-history text-5xl text-theme-secondary opacity-40 mb-3" />
            <p className="text-theme-secondary font-medium">Detailed answers were not recorded for this exam.</p>
          </div>
        )}
      </main>
    </div>
  )
}
