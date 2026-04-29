import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [studentName, setStudentName] = useState(() => localStorage.getItem('student_name') || '')
  const [showNameModal, setShowNameModal] = useState(false)
  const [pendingExamId, setPendingExamId] = useState(null)
  const [nameInput, setNameInput] = useState('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [now, setNow] = useState(new Date())
  const navigate = useNavigate()

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

  // tick every 30s to update live/past status
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetch('/api/exams')
      .then(r => r.json())
      .then(data => { setExams(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onContextMenu = e => e.preventDefault()
    document.addEventListener('contextmenu', onContextMenu)
    return () => document.removeEventListener('contextmenu', onContextMenu)
  }, [])

  const isLive = (exam) => {
    if (!exam.liveStart || !exam.liveEnd) return false
    return now >= new Date(exam.liveStart) && now <= new Date(exam.liveEnd)
  }
  const isPast = (exam) => {
    if (!exam.liveEnd) return false
    return now > new Date(exam.liveEnd)
  }
  const isUpcoming = (exam) => {
    if (!exam.liveStart) return false
    return now < new Date(exam.liveStart)
  }

  const liveExams = exams.filter(isLive)
  const pastExams = exams.filter(isPast)
  const upcomingExams = exams.filter(isUpcoming)

  const fmtDate = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

  const handleTakeExam = (examId) => {
    if (!studentName) {
      setPendingExamId(examId)
      setShowNameModal(true)
    } else {
      navigate(`/exam/${examId}`)
    }
  }

  const confirmName = async () => {
    if (!nameInput.trim()) return
    const newName = nameInput.trim()

    if (studentName && studentName !== newName) {
      try {
        await fetch('/api/submissions/name', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldName: studentName, newName })
        })
      } catch (e) {
        console.error('Failed to update past submissions:', e)
      }
    }

    localStorage.setItem('student_name', newName)
    setStudentName(newName)
    setShowNameModal(false)
    if (pendingExamId) navigate(`/exam/${pendingExamId}`)
  }

  const liveAlreadyTaken = (examId) => !!localStorage.getItem(`live_taken_${examId}`)

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme">
      {/* Header */}
      <header className="bg-theme-surface border-b border-theme-border sticky top-0 z-50 shadow-sm transition-theme">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer shrink-0" onClick={() => navigate('/')}>
            <img src="/exam-portal.png" alt="Logo" className="h-9 w-9 object-cover rounded-xl shadow-sm" />
            <h1 className="text-xl font-bold tracking-tight text-theme-primary">ExamPortal</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button onClick={toggleTheme}
              className="w-10 h-10 rounded-full flex shrink-0 items-center justify-center bg-theme-bg text-theme-secondary hover:text-theme-primary border border-theme-border transition-all">
              <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center space-x-3">
              <button onClick={() => navigate('/leaderboard')}
                className="px-3 py-2 rounded-xl text-sm font-medium text-theme-primary bg-theme-bg border border-theme-border hover:border-theme-primary/40 transition-all flex items-center space-x-2 shrink-0">
                <i className="fas fa-trophy text-yellow-500"></i>
                <span>Leaderboard</span>
              </button>
              {studentName && (
                <div className="relative">
                  <button onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex shrink-0 items-center space-x-1.5 text-sm font-medium text-theme-primary bg-theme-bg border border-theme-border hover:border-theme-primary/40 px-3 py-2 rounded-xl transition-all relative z-50"
                    title="Profile Options">
                    <i className="fas fa-user-circle text-theme-accent"></i>
                    <span className="max-w-[120px] truncate">{studentName}</span>
                    <i className={`fas fa-chevron-${showProfileMenu ? 'up' : 'down'} text-xs text-theme-secondary ml-1`}></i>
                  </button>
                  {showProfileMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                      <div className="absolute right-0 mt-2 w-48 bg-theme-surface border border-theme-border rounded-xl shadow-lg z-50 overflow-hidden">
                        <button onClick={() => { setShowProfileMenu(false); navigate('/profile') }}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-theme-primary hover:bg-theme-bg flex items-center space-x-3 transition-colors border-b border-theme-border/50">
                          <i className="fas fa-id-card text-theme-accent"></i>
                          <span>View Profile</span>
                        </button>
                        <button onClick={() => { setShowProfileMenu(false); setPendingExamId(null); setNameInput(studentName); setShowNameModal(true); }}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-theme-primary hover:bg-theme-bg flex items-center space-x-3 transition-colors">
                          <i className="fas fa-edit text-theme-secondary"></i>
                          <span>Edit Name</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Navigation (Hamburger) */}
            <div className="sm:hidden relative">
              <button onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-theme-bg text-theme-primary border border-theme-border hover:border-theme-primary/40 transition-all relative z-50">
                <i className={`fas ${showMobileMenu ? 'fa-times' : 'fa-bars'}`}></i>
              </button>
              {showMobileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMobileMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-theme-surface border border-theme-border rounded-xl shadow-lg z-50 overflow-hidden">
                    <button onClick={() => { setShowMobileMenu(false); navigate('/leaderboard') }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-theme-primary hover:bg-theme-bg flex items-center space-x-3 transition-colors border-b border-theme-border/50">
                      <i className="fas fa-trophy text-yellow-500 w-4 text-center"></i>
                      <span>Leaderboard</span>
                    </button>
                    {studentName && (
                      <>
                        <button onClick={() => { setShowMobileMenu(false); navigate('/profile') }}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-theme-primary hover:bg-theme-bg flex items-center space-x-3 transition-colors border-b border-theme-border/50">
                          <i className="fas fa-id-card text-theme-accent w-4 text-center"></i>
                          <span>View Profile</span>
                        </button>
                        <button onClick={() => { setShowMobileMenu(false); setPendingExamId(null); setNameInput(studentName); setShowNameModal(true); }}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-theme-primary hover:bg-theme-bg flex items-center space-x-3 transition-colors">
                          <i className="fas fa-edit text-theme-secondary w-4 text-center"></i>
                          <span>Edit Name</span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-14">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h2 className="text-4xl font-extrabold text-theme-primary">Digital Exam Portal</h2>
          <p className="text-theme-secondary max-w-xl mx-auto">Take live exams in real-time or revisit past exams for practice. All in one place.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-theme-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Upcoming Exams */}
            {upcomingExams.length > 0 && (
              <Section title="Upcoming Exams" icon="fa-calendar-alt" color="text-yellow-500">
                {upcomingExams.map(exam => (
                  <ExamCard key={exam._id} exam={exam} badge="upcoming" badgeColor="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                    fmtDate={fmtDate} disabled disabledLabel="Starts Soon" />
                ))}
              </Section>
            )}

            {/* Live Exams */}
            <Section title="Live Exams" icon="fa-circle text-red-500 animate-pulse" color="text-red-500">
              {liveExams.length === 0 ? (
                <p className="text-theme-secondary text-sm">No exams are live right now.</p>
              ) : liveExams.map(exam => {
                const taken = liveAlreadyTaken(exam._id)
                return (
                  <ExamCard key={exam._id} exam={exam} badge="LIVE" badgeColor="bg-red-500/10 text-red-500 border-red-500/20"
                    fmtDate={fmtDate}
                    disabled={taken}
                    disabledLabel="Already Submitted"
                    onStart={() => handleTakeExam(exam._id)} />
                )
              })}
            </Section>

            {/* Past Exams */}
            <Section title="Past Exams" icon="fa-history" color="text-theme-secondary">
              {pastExams.length === 0 ? (
                <p className="text-theme-secondary text-sm">No past exams yet.</p>
              ) : pastExams.map(exam => (
                <ExamCard key={exam._id} exam={exam} badge="Practice" badgeColor="bg-theme-accent/10 text-theme-accent border-theme-accent/20"
                  fmtDate={fmtDate} onStart={() => handleTakeExam(exam._id)} />
              ))}
            </Section>
          </>
        )}
      </main>

      {/* Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-theme-primary mb-2">Welcome!</h3>
            <p className="text-theme-secondary text-sm mb-5">Enter your name to get started. It'll be saved for future exams.</p>
            <input
              autoFocus
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmName()}
              placeholder="Your full name..."
              className="w-full px-4 py-3 rounded-xl bg-theme-bg border border-theme-border text-theme-primary outline-none focus:ring-2 focus:ring-theme-accent mb-4"
            />
            <button onClick={confirmName}
              className="w-full bg-theme-accent text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all">
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, color, children }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center space-x-3">
        <i className={`fas ${icon} ${color} text-lg`}></i>
        <h2 className="text-2xl font-extrabold text-theme-primary">{title}</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">{children}</div>
    </section>
  )
}

function ExamCard({ exam, badge, badgeColor, fmtDate, onStart, disabled, disabledLabel }) {
  return (
    <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-theme-accent/40 transition-all">
      <div>
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-theme-primary text-lg leading-snug">{exam.title}</h3>
          <span className={`text-xs font-bold px-2 py-1 rounded-full border flex-shrink-0 ml-2 ${badgeColor}`}>{badge}</span>
        </div>
        <div className="space-y-1 text-sm text-theme-secondary">
          <p><i className="fas fa-clock mr-2"></i>{exam.duration} min</p>
          {exam.liveStart && <p><i className="fas fa-play-circle mr-2"></i>{fmtDate(exam.liveStart)}</p>}
          {exam.liveEnd   && <p><i className="fas fa-stop-circle mr-2"></i>{fmtDate(exam.liveEnd)}</p>}
        </div>
      </div>
      <button
        onClick={disabled ? undefined : onStart}
        disabled={disabled}
        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${disabled
          ? 'bg-theme-bg text-theme-secondary cursor-not-allowed border border-theme-border'
          : 'bg-theme-accent text-white hover:opacity-90 shadow-md'}`}>
        {disabled ? (disabledLabel || 'Unavailable') : 'Start Exam →'}
      </button>
    </div>
  )
}
