import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Leaderboard() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const navigate = useNavigate()
  const toggleRef = useRef(null)

  const [selectedExamId, setSelectedExamId] = useState(null)

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const toggleTheme = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

    if (document.startViewTransition) {
      document.documentElement.style.setProperty('--tx', `${x}px`)
      document.documentElement.style.setProperty('--ty', `${y}px`)
      document.documentElement.style.setProperty('--tr', `${endRadius}px`)
      document.startViewTransition(() => {
        setTheme(t => t === 'dark' ? 'light' : 'dark')
      })
    } else {
      setTheme(t => t === 'dark' ? 'light' : 'dark')
    }
  }

  const fmtDate = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

  const getRankStyle = (rank) => {
    if (rank === 1) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    if (rank === 2) return 'bg-slate-300/10 text-slate-400 border-slate-400/20'
    if (rank === 3) return 'bg-amber-700/10 text-amber-600 border-amber-600/20'
    return 'bg-theme-bg text-theme-secondary border-theme-border'
  }

  const getRankIcon = (rank) => {
    if (rank <= 3) return 'fas fa-trophy'
    return 'fas fa-hashtag'
  }

  const selectedData = selectedExamId ? data.find(d => d.exam._id === selectedExamId) : null

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme">
      {/* Header */}
      <header className="bg-theme-surface border-b border-theme-border sticky top-0 z-50 shadow-sm transition-theme">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={() => selectedExamId ? setSelectedExamId(null) : navigate('/')}
              className="w-9 h-9 rounded-full bg-theme-bg flex items-center justify-center border border-theme-border text-theme-secondary hover:text-theme-primary transition-all">
              <i className="fas fa-arrow-left"></i>
            </button>
            <h1 className="text-lg font-bold text-theme-primary">Leaderboard</h1>
          </div>
          <button ref={toggleRef} onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-theme-bg text-theme-secondary hover:text-theme-primary border border-theme-border transition-all">
            <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        {!selectedExamId && (
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-theme-primary">Live Exam Leaderboards</h2>
            <p className="text-theme-secondary text-sm">Rankings from all past live exam submissions.</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-theme-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20 text-theme-secondary">
            <i className="fas fa-trophy text-5xl mb-4 opacity-30"></i>
            <p className="font-medium">No live exam results yet.</p>
          </div>
        ) : !selectedExamId ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.map(({ exam, submissions }) => (
              <div key={exam._id} onClick={() => setSelectedExamId(exam._id)}
                className="bg-theme-surface border border-theme-border rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-theme-accent/40 hover:-translate-y-1 transition-all cursor-pointer">
                <div>
                  <h3 className="font-bold text-theme-primary text-lg leading-snug mb-3">{exam.title}</h3>
                  <div className="space-y-1 text-sm text-theme-secondary">
                    <p><i className="fas fa-clock mr-2"></i>{exam.duration} min</p>
                    <p><i className="fas fa-calendar-alt mr-2"></i>Ended: {new Date(exam.liveEnd).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-theme-border pt-4 mt-2">
                  <span className="text-sm font-bold text-theme-accent bg-theme-accent/10 px-3 py-1 rounded-lg">
                    <i className="fas fa-users mr-2"></i>{submissions.length} Taken
                  </span>
                  <i className="fas fa-arrow-right text-theme-secondary"></i>
                </div>
              </div>
            ))}
          </div>
        ) : selectedData && (
          <section className="space-y-6">
            <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-2xl font-extrabold text-theme-primary">{selectedData.exam.title}</h2>
              <p className="text-sm text-theme-secondary mt-1">
                <i className="fas fa-calendar-alt mr-1"></i>{fmtDate(selectedData.exam.liveStart)} - {fmtDate(selectedData.exam.liveEnd)}
              </p>
            </div>

            {/* Table */}
            <div className="bg-theme-surface border border-theme-border rounded-2xl overflow-hidden shadow-sm">
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-2 px-3 sm:px-5 py-3 text-[10px] sm:text-xs uppercase tracking-wider font-bold text-theme-secondary border-b border-theme-border bg-theme-bg/50">
                <div className="col-span-2 sm:col-span-1 text-center">#</div>
                <div className="col-span-5 sm:col-span-3 pl-1">Name</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-2 text-center hidden sm:block">Wrong</div>
                <div className="col-span-2 text-center hidden sm:block">Skipped</div>
                <div className="col-span-3 sm:col-span-2 text-right">Time</div>
              </div>

              {/* Rows */}
              {selectedData.submissions.map((sub, idx) => {
                const rank = idx + 1
                return (
                  <div key={sub._id} className={`grid grid-cols-12 gap-2 px-3 sm:px-5 py-3.5 items-center text-sm border-b border-theme-border/50 last:border-b-0 transition-colors hover:bg-theme-bg/50 ${rank <= 3 ? 'bg-theme-bg/30' : ''}`}>
                    <div className="col-span-2 sm:col-span-1 flex justify-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${getRankStyle(rank)}`}>
                        {rank <= 3 ? <i className={getRankIcon(rank)}></i> : rank}
                      </span>
                    </div>
                    <div className="col-span-5 sm:col-span-3 font-semibold text-theme-primary truncate pl-1">{sub.studentName}</div>
                    <div className="col-span-2 text-center">
                      <span className="font-bold text-theme-accent">{sub.score}</span>
                      <span className="text-theme-secondary">/{sub.total}</span>
                    </div>
                    <div className="col-span-2 text-center hidden sm:block text-theme-error-text font-medium">{sub.wrong}</div>
                    <div className="col-span-2 text-center hidden sm:block text-theme-secondary">{sub.unanswered}</div>
                    <div className="col-span-3 sm:col-span-2 text-right text-xs text-theme-secondary">
                      {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
