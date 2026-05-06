'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useUser } from '@clerk/nextjs'
import { useTheme } from '@/context/ThemeContext'
import PageSkeleton from './PageSkeleton'

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const { user, isLoaded } = hasClerk ? useUser() : { user: null, isLoaded: true }

  if (!isLoaded) return <PageSkeleton />

  return (
    <div className="sticky top-4 sm:top-6 z-50 px-4 transition-theme pointer-events-none">
      <header 
        className="max-w-5xl mx-auto backdrop-blur-xl border border-theme-border rounded-2xl shadow-lg h-16 flex items-center justify-between px-4 sm:px-6 pointer-events-auto"
        style={{ background: 'color-mix(in srgb, var(--color-surface) 70%, transparent)' }}
      >
        <Link href="/" className="flex items-center space-x-3 cursor-pointer shrink-0">
          <Image src="/favicon.png" alt="Logo" width={36} height={36} className="object-contain rounded-xl shadow-sm" />
          <h1 className="text-xl font-bold tracking-tight text-theme-primary truncate max-w-[200px] sm:max-w-none">
            IT Resource Zone
          </h1>
        </Link>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex shrink-0 items-center justify-center bg-theme-bg text-theme-secondary hover:text-theme-primary border border-theme-border transition-all"
          >
            <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
          </button>
          <div className="hidden sm:flex items-center space-x-3">
            <Link
              href="/exams"
              className="px-3 py-2 rounded-xl text-sm font-medium text-theme-primary bg-theme-bg border border-theme-border hover:border-theme-primary/40 transition-all flex items-center space-x-2 shrink-0"
            >
              <i className="fas fa-list-alt text-theme-accent" />
              <span>Exams</span>
            </Link>
            <Link
              href="/leaderboard"
              className="px-3 py-2 rounded-xl text-sm font-medium text-theme-primary bg-theme-bg border border-theme-border hover:border-theme-primary/40 transition-all flex items-center space-x-2 shrink-0"
            >
              <i className="fas fa-trophy text-yellow-500" />
              <span>Leaderboard</span>
            </Link>
            {user ? (
              <Link
                href="/profile"
                className="flex shrink-0 items-center text-sm font-medium text-theme-primary bg-theme-bg border border-theme-border hover:border-theme-primary/40 px-3 py-2 rounded-xl transition-all"
                title="View Profile"
              >
                <span className="max-w-[120px] truncate">{user.fullName || user.firstName || 'Profile'}</span>
              </Link>
            ) : hasClerk ? (
              <Link
                href="/sign-in"
                className="px-3 py-2 rounded-xl text-sm font-medium text-white bg-theme-accent hover:opacity-90 transition-all"
              >
                Sign In
              </Link>
            ) : null}
          </div>
        </div>
      </header>
    </div>
  )
}
