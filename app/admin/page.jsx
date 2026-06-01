'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/context/ThemeContext'

export default function AdminLoginPage() {
  const { theme } = useTheme()
  const logoSrc = theme === 'dark' ? '/favicon.png' : '/favicon1.png'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Login failed')
        return
      }
      router.push('/admin/dashboard')
    } catch {
      setError('Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-theme-surface border border-theme-border rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-center mb-8">
          <Link href="/" className="flex items-center space-x-3">
            <Image src={logoSrc} alt="Logo" width={40} height={40} className="rounded-xl object-contain" />
            <div>
              <p className="text-sm text-theme-secondary">IT Resource Zone</p>
              <h1 className="text-xl font-extrabold text-theme-primary">Admin Login</h1>
            </div>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <div className="p-3 bg-theme-error-bg border border-theme-error-border text-theme-error-text rounded-xl text-sm">{error}</div> : null}
          <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" className="input-field" />
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="input-field" />
          <button type="submit" disabled={loading} className="w-full py-3 bg-theme-accent text-theme-accent-text font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center">
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
