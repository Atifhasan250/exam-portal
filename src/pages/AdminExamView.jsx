import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { safeHTML } from '../utils/sanitize'

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('admin_token')}`
})

export default function AdminExamView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [questionToDelete, setQuestionToDelete] = useState(null) // index of question to delete

  const fetchExam = async () => {
    try {
      const res = await fetch(`/api/exams/${id}`)
      const data = await res.json()
      setExam(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchExam() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const confirmDeleteQuestion = async () => {
    await fetch(`/api/exams/${id}/questions/${questionToDelete}`, { method: 'DELETE', headers: authHeaders() })
    setQuestionToDelete(null)
    fetchExam()
  }

  if (loading) return <div className="min-h-screen bg-theme-bg flex items-center justify-center"><div className="w-10 h-10 border-4 border-theme-accent border-t-transparent rounded-full animate-spin"></div></div>

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme">
      <header className="bg-theme-surface border-b border-theme-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/admin/dashboard')} className="w-9 h-9 rounded-full bg-theme-bg flex items-center justify-center border border-theme-border text-theme-secondary hover:text-theme-primary">
              <i className="fas fa-arrow-left"></i>
            </button>
            <h1 className="text-lg font-bold text-theme-primary truncate">{exam?.title || 'Exam'}</h1>
          </div>
          <button onClick={toggleTheme}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-theme-bg text-theme-secondary border border-theme-border hover:text-theme-primary transition-all">
            <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-theme-secondary text-sm">{exam?.questions?.length || 0} question(s)</p>
        </div>

        {exam?.questions?.map((q, idx) => (
          <div key={idx} className="bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-theme-primary text-sm mb-2">
                  <span className="text-theme-secondary mr-2">{idx + 1}.</span>
                  <span dangerouslySetInnerHTML={{ __html: safeHTML(q.question) }} />
                </p>
                <div className="grid gap-1.5 ml-5">
                  {q.options.map((opt, oi) => (
                    <p key={oi} className={`text-sm ${oi === q.correct ? 'text-theme-success-text font-bold' : 'text-theme-secondary'}`}>
                      {oi + 1}. <span dangerouslySetInnerHTML={{ __html: safeHTML(opt) }} /> {oi === q.correct ? '(correct)' : ''}
                    </p>
                  ))}
                </div>
                {q.explanation && (
                  <p className="text-xs text-theme-secondary mt-2 italic ml-5">
                    <i className="fas fa-lightbulb text-yellow-500 mr-1"></i>{q.explanation}
                  </p>
                )}
              </div>
              <button onClick={() => setQuestionToDelete(idx)}
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-theme-error-bg text-theme-error-text border border-theme-error-border flex items-center justify-center hover:opacity-80 transition-all text-xs">
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </div>
        ))}

        {(!exam?.questions || exam.questions.length === 0) && (
          <div className="text-center py-16 text-theme-secondary">
            <i className="fas fa-question-circle text-4xl mb-3 opacity-40"></i>
            <p>No questions added yet.</p>
          </div>
        )}
      </main>

      {/* Custom Delete Question Modal (Fix 6.4 / Section 3.7) */}
      {questionToDelete !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5 modal-panel">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-theme-error-bg flex items-center justify-center text-theme-error-text border-4 border-theme-error-border/30">
                <i className="fas fa-trash-alt text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold text-theme-primary">Delete Question?</h3>
              <p className="text-theme-secondary text-sm">
                Are you sure you want to permanently delete question <strong>{questionToDelete + 1}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button onClick={() => setQuestionToDelete(null)}
                className="flex-1 bg-theme-bg text-theme-secondary border border-theme-border hover:text-theme-primary py-2.5 rounded-xl font-bold transition-all">
                Cancel
              </button>
              <button onClick={confirmDeleteQuestion}
                className="flex-1 bg-theme-error-bg text-theme-error-text border border-theme-error-border hover:opacity-80 py-2.5 rounded-xl font-bold transition-all">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
