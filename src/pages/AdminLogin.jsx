import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const navigate = useNavigate()

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', theme)
    if (localStorage.getItem('admin_token')) navigate('/admin/dashboard')
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

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      localStorage.setItem('admin_token', data.token)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-theme-bg min-h-screen flex items-center justify-center p-4 transition-theme">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/exam-portal.png" alt="Logo" className="h-16 w-16 object-cover rounded-2xl shadow-lg mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-theme-primary">Admin Portal</h1>
          <p className="text-theme-secondary text-sm mt-1">Sign in to manage exams</p>
        </div>

        <form onSubmit={handleLogin} className="bg-theme-surface border border-theme-border rounded-2xl p-8 shadow-xl space-y-5">
          {error && (
            <div className="p-3 bg-theme-error-bg border border-theme-error-border text-theme-error-text rounded-xl text-sm flex items-center space-x-2">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl bg-theme-bg border border-theme-border text-theme-primary outline-none focus:ring-2 focus:ring-theme-accent transition-all"
              placeholder="admin" />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl bg-theme-bg border border-theme-border text-theme-primary outline-none focus:ring-2 focus:ring-theme-accent transition-all"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-theme-accent text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center space-x-2 disabled:opacity-60">
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              : <><i className="fas fa-lock"></i><span>Sign In</span></>}
          </button>
        </form>

        <div className="text-center mt-6">
          <button onClick={toggleTheme}
            className="text-theme-secondary hover:text-theme-primary text-sm transition-colors">
            <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} mr-2`}></i>
            Toggle Theme
          </button>
        </div>
      </div>
    </div>
  )
}
