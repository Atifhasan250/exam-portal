import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'

export default function Leaderboard() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const navigate = useNavigate()
  const toggleRef = useRef(null)

  const { id } = useParams()
  const selectedExamId = id

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const selectedData = selectedExamId ? data.find(item => item.exam._id === selectedExamId) : null

  const fmtDate = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

  const getRankStyle = (rank) => {
    if (rank === 1) return 'bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
    if (rank === 2) return 'bg-slate-300/10 border-slate-300 text-slate-400'
    if (rank === 3) return 'bg-orange-500/10 border-orange-500 text-orange-600'
    return 'bg-theme-bg border-theme-border text-theme-secondary'
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return 'fas fa-crown'
    if (rank === 2) return 'fas fa-medal'
    if (rank === 3) return 'fas fa-award'
    return null
  }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme pb-20">
      <Navbar />
      <BottomNav />

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        {!selectedExamId && (
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Link to="/exams" className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all shrink-0">
                 <i className="fas fa-arrow-left"></i>
              </Link>
              <h2 className="text-3xl font-extrabold text-theme-primary">Live Exam Leaderboards</h2>
            </div>
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
              <div key={exam._id} onClick={() => navigate(`/leaderboard/${exam._id}`)}
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
            <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 shadow-sm relative">
              <button onClick={() => navigate('/leaderboard')}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 rounded-full bg-theme-bg flex items-center justify-center border border-theme-border text-theme-secondary hover:text-theme-primary transition-all">
                <i className="fas fa-arrow-left"></i>
              </button>
              <h2 className="text-2xl font-extrabold text-theme-primary pr-12">{selectedData.exam.title}</h2>
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
