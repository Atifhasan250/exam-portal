import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('admin_token')}`
})

export default function AdminExamView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    if (document.startViewTransition) {
      document.documentElement.style.setProperty('--tx', `${x}px`)
      document.documentElement.style.setProperty('--ty', `${y}px`)
      document.documentElement.style.setProperty('--tr', `${endRadius}px`)
      document.startViewTransition(() => setTheme(t => t === 'dark' ? 'light' : 'dark'))
    } else {
      setTheme(t => t === 'dark' ? 'light' : 'dark')
    }
  }

  const fetchExam = async () => {
    try {
      const res = await fetch(`/api/exams/${id}`)
      const data = await res.json()
      setExam(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchExam() }, [id])

  const deleteQuestion = async (qIdx) => {
    if (!confirm(`Delete question ${qIdx + 1}?`)) return
    await fetch(`/api/exams/${id}/questions/${qIdx}`, { method: 'DELETE', headers: authHeaders() })
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
                  <span dangerouslySetInnerHTML={{ __html: q.question }} />
                </p>
                <div className="grid gap-1.5 ml-5">
                  {q.options.map((opt, oi) => (
                    <p key={oi} className={`text-sm ${oi === q.correct ? 'text-theme-success-text font-bold' : 'text-theme-secondary'}`}>
                      {oi + 1}. <span dangerouslySetInnerHTML={{ __html: opt }} /> {oi === q.correct ? '(correct)' : ''}
                    </p>
                  ))}
                </div>
                {q.explanation && (
                  <p className="text-xs text-theme-secondary mt-2 italic ml-5">
                    <i className="fas fa-lightbulb text-yellow-500 mr-1"></i>{q.explanation}
                  </p>
                )}
              </div>
              <button onClick={() => deleteQuestion(idx)}
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
    </div>
  )
}
