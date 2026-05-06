'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { safeHTML } from '@/utils/sanitize'

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
      <div className="bg-theme-bg min-h-screen text-theme-primary pb-20">
        <div className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
          <div className="skeleton h-10 w-64 rounded-xl" />
          <div className="skeleton h-32 w-full rounded-2xl" />
          <div className="space-y-4">
            {[0, 1, 2].map((item) => <div key={item} className="skeleton h-28 w-full rounded-2xl" />)}
          </div>
        </div>
      </div>
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

  const { submission, questions } = data
  const percentage = (submission.score / submission.total) * 100
  const filteredQuestions = questions
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
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        <div className="flex items-center space-x-3 mb-6">
          <Link href="/profile" className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all">
            <i className="fas fa-arrow-left" />
          </Link>
          <h2 className="text-3xl font-extrabold text-theme-primary truncate">{submission.examId?.title || 'Exam Details'}</h2>
        </div>
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col items-center text-center">
          <p className="text-sm font-bold text-theme-secondary mb-1 uppercase tracking-widest">Score</p>
          <div className="text-5xl font-black text-theme-primary mb-2">{submission.score}<span className="text-2xl text-theme-secondary">/{submission.total}</span></div>
          <p className={`font-bold ${percentage >= 70 ? 'text-theme-success-text' : percentage >= 40 ? 'text-yellow-500' : 'text-theme-error-text'}`}>{percentage.toFixed(0)}%</p>
        </div>

        {submission.answers ? (
          <div className="space-y-4">
            <div className="flex justify-center bg-theme-surface border border-theme-border rounded-xl p-1.5 shadow-sm max-w-sm mx-auto">
              {['all', 'right', 'wrong'].map((value) => (
                <button key={value} onClick={() => setFilter(value)} className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${filter === value ? value === 'right' ? 'bg-theme-success-bg text-theme-success-text shadow-sm' : value === 'wrong' ? 'bg-theme-error-bg text-theme-error-text shadow-sm' : 'bg-theme-bg border border-theme-border shadow-sm' : 'text-theme-secondary hover:text-theme-primary'}`}>
                  {value}
                </button>
              ))}
            </div>

            <div className="space-y-4 mt-6">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-10 text-theme-secondary">
                  <i className="fas fa-folder-open text-4xl mb-3 opacity-40" />
                  <p>No questions found for this filter.</p>
                </div>
              ) : filteredQuestions.map(({ question, index, userAnswer, isCorrect }) => (
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
