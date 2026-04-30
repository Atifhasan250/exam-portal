import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

export default function Navbar({ studentName, setStudentName }) {
  const { theme, toggleTheme } = useTheme()
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameInput, setNameInput] = useState('')

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
    if (setStudentName) setStudentName(newName)
    setShowNameModal(false)
  }

  const displayStudentName = studentName !== undefined ? studentName : (localStorage.getItem('student_name') || '')

  return (
    <>
      <header className="bg-theme-surface border-b border-theme-border sticky top-0 z-50 shadow-sm transition-theme">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 cursor-pointer shrink-0">
            <img src="/favicon.png" alt="Logo" className="h-9 w-9 object-contain rounded-xl shadow-sm" />
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
                <Link to="/profile"
                  className="flex shrink-0 items-center space-x-1.5 text-sm font-medium text-theme-primary bg-theme-bg border border-theme-border hover:border-theme-primary/40 px-3 py-2 rounded-xl transition-all"
                  title="View Profile">
                  <i className="fas fa-user-circle text-theme-accent"></i>
                  <span className="max-w-[120px] truncate">{displayStudentName}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {showNameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 max-w-sm w-full shadow-2xl modal-panel">
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
