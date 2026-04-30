import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { safeHTML } from '../utils/sanitize'

export default function SubmissionDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // all, right, wrong

  useEffect(() => {
    fetch(`/api/submissions/details/${id}`)
      .then(r => r.json())
      .then(res => {
        if (res.error) setError(res.error)
        else setData(res)
      })
      .catch(() => setError('Failed to load submission details'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="min-h-screen bg-theme-bg flex items-center justify-center"><div className="w-10 h-10 border-4 border-theme-accent border-t-transparent rounded-full animate-spin"></div></div>
  if (error) return (
    <div className="min-h-screen bg-theme-bg flex flex-col items-center justify-center space-y-4 text-theme-primary px-6 text-center">
      <i className="fas fa-exclamation-triangle text-4xl text-theme-error-text"></i>
      <p className="font-bold text-xl">{error}</p>
      <button onClick={() => navigate('/profile')} className="text-theme-accent underline text-sm">← Back to Profile</button>
    </div>
  )

  const { submission, questions } = data
  const pct = (submission.score / submission.total) * 100

  const filteredQuestions = questions.map((q, idx) => {
    const userAns = submission.answers ? submission.answers[idx] : undefined
    const isCorrect = userAns === q.correct
    return { q, idx, userAns, isCorrect }
  }).filter(item => {
    if (filter === 'right') return item.isCorrect
    if (filter === 'wrong') return !item.isCorrect
    return true
  })

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme pb-20 page-enter">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        <div className="flex items-center space-x-3 mb-6">
          <Link to="/profile" className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all">
             <i className="fas fa-arrow-left"></i>
          </Link>
          <h2 className="text-3xl font-extrabold text-theme-primary truncate">
             {submission.examId?.title || 'Exam Details'}
          </h2>
        </div>
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col items-center text-center">
          <p className="text-sm font-bold text-theme-secondary mb-1 uppercase tracking-widest">Score</p>
          <div className="text-5xl font-black text-theme-primary mb-2">
            {submission.score}<span className="text-2xl text-theme-secondary">/{submission.total}</span>
          </div>
          <p className={`font-bold ${pct >= 70 ? 'text-theme-success-text' : pct >= 40 ? 'text-yellow-500' : 'text-theme-error-text'}`}>
            {pct.toFixed(0)}%
          </p>
        </div>

        {submission.answers ? (
          <div className="space-y-4">
            <div className="flex justify-center bg-theme-surface border border-theme-border rounded-xl p-1.5 shadow-sm max-w-sm mx-auto">
              {['all', 'right', 'wrong'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                    filter === f
                    ? f === 'right' ? 'bg-theme-success-bg text-theme-success-text shadow-sm' : f === 'wrong' ? 'bg-theme-error-bg text-theme-error-text shadow-sm' : 'bg-theme-bg border border-theme-border shadow-sm'
                    : 'text-theme-secondary hover:text-theme-primary'
                  }`}>
                  {f}
                </button>
              ))}
            </div>

            <div className="space-y-4 mt-6">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-10 text-theme-secondary">
                  <i className="fas fa-folder-open text-4xl mb-3 opacity-40"></i>
                  <p>No questions found for this filter.</p>
                </div>
              ) : (
                filteredQuestions.map(({ q, idx, userAns, isCorrect }) => (
                  <div key={idx} className={`p-5 rounded-2xl border ${isCorrect ? 'bg-theme-success-bg border-theme-success-border' : 'bg-theme-error-bg border-theme-error-border'}`}>
                    <div className="font-bold text-theme-primary mb-4 text-sm sm:text-base leading-relaxed [&_p]:m-0 [&_p]:inline" dangerouslySetInnerHTML={{ __html: safeHTML(`${idx + 1}. ${q.question}`) }} />
                    <div className="text-sm space-y-2.5">
                      <p className={`${isCorrect ? 'text-theme-success-text' : 'text-theme-error-text'} font-semibold`}>
                        Your answer: {userAns !== undefined ? <span className="font-medium [&_p]:m-0 [&_p]:inline" dangerouslySetInnerHTML={{ __html: safeHTML(q.options[userAns]) }} /> : <i>Not answered</i>}
                      </p>
                      {!isCorrect && <div className="text-theme-success-text font-semibold">Correct: <span className="font-medium [&_p]:m-0 [&_p]:inline" dangerouslySetInnerHTML={{ __html: safeHTML(q.options[q.correct]) }} /></div>}
                      {q.explanation && <div className="text-theme-secondary mt-4 text-xs sm:text-sm border-t border-theme-border pt-3 leading-relaxed [&_p]:m-0 [&_p]:inline"><i className="fas fa-lightbulb mr-1.5 text-yellow-500"></i><span dangerouslySetInnerHTML={{ __html: safeHTML(q.explanation) }} /></div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-theme-surface border border-theme-border rounded-2xl shadow-sm">
            <i className="fas fa-history text-5xl text-theme-secondary opacity-40 mb-3"></i>
            <p className="text-theme-secondary font-medium">Detailed answers were not recorded for this exam.</p>
          </div>
        )}
      </main>
    </div>
  )
}
