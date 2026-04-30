import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Navbar({ studentName, setStudentName }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameInput, setNameInput] = useState('')
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
    if (setStudentName) setStudentName(newName)
    setShowNameModal(false)
  }

  const displayStudentName = studentName !== undefined ? studentName : (localStorage.getItem('student_name') || '')

  return (
    <>
      <header className="bg-theme-surface border-b border-theme-border sticky top-0 z-50 shadow-sm transition-theme">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 cursor-pointer shrink-0">
            <img src="/favicon.png" alt="Logo" className="h-9 w-9 object-cover rounded-xl shadow-sm" />
            <h1 className="text-xl font-bold tracking-tight text-theme-primary truncate max-w-[200px] sm:max-w-none">IT Resource Zone</h1>
          </Link>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button onClick={toggleTheme}
              className="w-10 h-10 rounded-full flex shrink-0 items-center justify-center bg-theme-bg text-theme-secondary hover:text-theme-primary border border-theme-border transition-all">
              <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            {/* Desktop Navigation only */}
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
              {displayStudentName && (
                <div className="relative">
                  <button onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex shrink-0 items-center space-x-1.5 text-sm font-medium text-theme-primary bg-theme-bg border border-theme-border hover:border-theme-primary/40 px-3 py-2 rounded-xl transition-all relative z-50"
                    title="Profile Options">
                    <i className="fas fa-user-circle text-theme-accent"></i>
                    <span className="max-w-[120px] truncate">{displayStudentName}</span>
                    <i className={`fas fa-chevron-${showProfileMenu ? 'up' : 'down'} text-xs text-theme-secondary ml-1`}></i>
                  </button>
                  {showProfileMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                      <div className="absolute right-0 mt-2 w-48 bg-theme-surface border border-theme-border rounded-xl shadow-lg z-50 overflow-hidden">
                        <Link to="/profile" onClick={() => setShowProfileMenu(false)}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-theme-primary hover:bg-theme-bg flex items-center space-x-3 transition-colors border-b border-theme-border/50">
                          <i className="fas fa-id-card text-theme-accent"></i>
                          <span>View Profile</span>
                        </Link>
                        <button onClick={() => { setShowProfileMenu(false); setNameInput(displayStudentName); setShowNameModal(true); }}
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
          </div>
        </div>
      </header>

      {showNameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-theme-primary mb-2">Edit Name</h3>
            <p className="text-theme-secondary text-sm mb-5">Enter your full name to update your profile.</p>
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
              Save
            </button>
            <button onClick={() => setShowNameModal(false)}
              className="mt-3 w-full bg-theme-bg text-theme-primary border border-theme-border font-bold py-3 rounded-xl hover:bg-theme-bg/50 transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
