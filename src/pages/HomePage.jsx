import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

export default function HomePage() {
  const { theme, toggleTheme } = useTheme()
  const [studentName, setStudentName] = useState(() => localStorage.getItem('student_name') || '')
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const navigate = useNavigate()

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
    window.dispatchEvent(new Event('student_name_changed'))
    setStudentName(newName)
    setShowNameModal(false)
  }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme flex flex-col page-enter">
      {/* Header */}
      <header className="bg-theme-surface border-b border-theme-border sticky top-0 z-50 shadow-sm transition-theme">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 cursor-pointer shrink-0">
            <img src="/favicon.png" alt="Logo" className="h-9 w-9 object-contain" />
            <h1 className="text-xl font-bold tracking-tight text-theme-primary">IT Resource Zone</h1>
          </Link>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button onClick={toggleTheme}
              className="w-10 h-10 rounded-full flex shrink-0 items-center justify-center bg-theme-bg text-theme-secondary hover:text-theme-primary border border-theme-border transition-all">
              <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center space-x-3">
              <Link to="/exams"
                className="px-3 py-2 rounded-xl text-sm font-medium text-theme-primary bg-theme-bg border border-theme-border hover:border-theme-primary/40 transition-all flex items-center space-x-2 shrink-0">
                <i className="fas fa-list-alt text-theme-accent"></i>
                <span>Exams</span>
              </Link>
              <Link to="/leaderboard"
                className="px-3 py-2 rounded-xl text-sm font-medium text-theme-primary bg-theme-bg border border-theme-border hover:border-theme-primary/40 transition-all flex items-center space-x-2 shrink-0">
                <i className="fas fa-trophy text-yellow-500"></i>
                <span>Leaderboard</span>
              </Link>
              {studentName && (
                <Link to="/profile"
                  className="flex shrink-0 items-center space-x-1.5 text-sm font-medium text-theme-primary bg-theme-bg border border-theme-border hover:border-theme-primary/40 px-3 py-2 rounded-xl transition-all"
                  title="View Profile">
                  <i className="fas fa-user-circle text-theme-accent"></i>
                  <span className="max-w-[120px] truncate">{studentName}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center py-10 sm:py-20 px-4">
        {/* Hero */}
        <div className="text-center space-y-8 max-w-2xl mb-24 sm:mb-0">
          <div className="space-y-4">
            <h2 className="text-5xl font-extrabold text-theme-primary">IT Resource Zone</h2>
            <p className="text-lg text-theme-secondary max-w-xl mx-auto">
              Welcome to the official exam and assessment platform. Take live exams in real-time or revisit past exams for practice. All in one place.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/exams" className="w-full sm:w-auto px-8 py-4 bg-theme-accent text-white font-bold rounded-xl hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-95 shadow-lg transition-all duration-300 flex items-center justify-center space-x-2">
              <i className="fas fa-rocket"></i>
              <span>Browse Exams</span>
            </Link>
            {!studentName && (
              <button onClick={() => setShowNameModal(true)} className="w-full sm:w-auto px-8 py-4 bg-theme-bg text-theme-primary border border-theme-border font-bold rounded-xl hover:-translate-y-1 hover:shadow-xl hover:border-theme-primary/40 hover:bg-theme-surface active:scale-95 shadow-sm transition-all duration-300 flex items-center justify-center space-x-2">
                <i className="fas fa-user-plus"></i>
                <span>Register Profile</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 max-w-sm w-full shadow-2xl modal-panel">
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
