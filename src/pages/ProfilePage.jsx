import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage() {
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  
  const studentName = localStorage.getItem('student_name')

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

  useEffect(() => {
    if (!studentName) {
      navigate('/')
      return
    }

    fetch(`/api/submissions/${encodeURIComponent(studentName)}`)
      .then(r => r.json())
      .then(data => {
        setSubmissions(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [studentName, navigate])

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme pb-20">
      {/* Header */}
      <header className="bg-theme-surface border-b border-theme-border sticky top-0 z-50 shadow-sm transition-theme">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <i className="fas fa-arrow-left text-theme-secondary hover:text-theme-primary transition-colors"></i>
            <h1 className="text-xl font-bold tracking-tight text-theme-primary">Your Profile</h1>
          </div>
          <button onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex shrink-0 items-center justify-center bg-theme-bg text-theme-secondary hover:text-theme-primary border border-theme-border transition-all">
            <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 mb-8 text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-sm">
          <div className="w-24 h-24 rounded-full bg-theme-accent/10 border border-theme-accent/20 flex items-center justify-center text-theme-accent shrink-0">
            <i className="fas fa-user text-4xl"></i>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-theme-primary">{studentName}</h2>
            <p className="text-theme-secondary mt-1">
              You have attempted {submissions.length} exam{submissions.length === 1 ? '' : 's'} in total.
            </p>
          </div>
        </div>

        <h3 className="text-xl font-bold text-theme-primary mb-4 border-b border-theme-border pb-2">Exam History</h3>
        
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-theme-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-16 bg-theme-surface border border-theme-border rounded-2xl shadow-sm">
            <i className="fas fa-inbox text-5xl text-theme-secondary opacity-40 mb-3"></i>
            <p className="text-theme-secondary font-medium">No exams taken yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map(sub => {
              const pct = (sub.score / sub.total) * 100
              return (
                <div key={sub._id} className="bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-bold text-theme-primary text-lg truncate">
                        {sub.examId?.title || 'Unknown Exam'}
                      </h4>
                      {sub.wasLive ? (
                        <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-theme-success-bg text-theme-success-text border border-theme-success-border rounded-md">Live</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-theme-bg text-theme-secondary border border-theme-border rounded-md">Practice</span>
                      )}
                    </div>
                    <p className="text-xs text-theme-secondary">
                      <i className="fas fa-calendar-alt mr-1.5"></i>
                      {new Date(sub.submittedAt).toLocaleString(undefined, {
                        dateStyle: 'medium', timeStyle: 'short'
                      })}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-6 w-full sm:w-auto pl-2 sm:pl-4 border-l-0 sm:border-l border-theme-border">
                    <div className="text-center flex-1 sm:flex-none">
                      <p className="text-[10px] uppercase font-bold text-theme-secondary mb-0.5">Score</p>
                      <p className={`font-black text-xl ${pct >= 70 ? 'text-theme-success-text' : pct >= 40 ? 'text-yellow-500' : 'text-theme-error-text'}`}>
                        {sub.score}<span className="text-sm text-theme-secondary font-medium">/{sub.total}</span>
                      </p>
                    </div>
                    <div className="text-center flex-1 sm:flex-none">
                      <p className="text-[10px] uppercase font-bold text-theme-secondary mb-0.5">Percent</p>
                      <p className="font-bold text-theme-primary">{pct.toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
