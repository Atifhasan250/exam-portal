'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useUser } from '@clerk/nextjs'
import { useTheme } from '@/context/ThemeContext'
import PageSkeleton from './PageSkeleton'
import StaggeredMenu from './StaggeredMenu'

const MENU_ITEMS = [
  { label: 'Home',        ariaLabel: 'Go to home page',       link: '/' },
  { label: 'Exams',       ariaLabel: 'Browse all exams',       link: '/exams' },
  { label: 'Leaderboard', ariaLabel: 'View leaderboard',       link: '/leaderboard' },
  { label: 'Tasks',       ariaLabel: 'View tasks',             link: '/tasks' },
  { label: 'Resources',   ariaLabel: 'View resources',         link: '/resources' },
  { label: 'Profile',     ariaLabel: 'View your profile',      link: '/profile' },
]

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { user, isLoaded } = useUser()

  // Theme-aware StaggeredMenu colours
  const isDark = theme === 'dark'
  const menuBtnColor   = isDark ? '#E8EAF6' : '#1A2040'
  const accentColor    = isDark ? '#6366F1' : '#4F46E5'
  const underlayColors = isDark
    ? ['#1E2A48', '#0F1524']
    : ['#BCC6DF', '#d0d9f0']

  if (!isLoaded) return <PageSkeleton />

  return (
    <div className="sticky top-2.5 sm:top-2.5 z-[9999] px-4 transition-theme pointer-events-none">
      <header
        className="max-w-6xl mx-auto backdrop-blur-xl border border-theme-border rounded-2xl shadow-lg h-16 flex items-center justify-between px-4 sm:px-6 pointer-events-auto"
        style={{ background: 'color-mix(in srgb, var(--color-surface) 70%, transparent)' }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3 cursor-pointer shrink-0">
          <Image src="/favicon.png" alt="Logo" width={36} height={36} className="object-contain rounded-xl shadow-sm" />
          <h1 className="text-xl font-bold tracking-tight text-theme-primary truncate max-w-[200px] sm:max-w-none">
            IT Resource Zone
          </h1>
        </Link>

        {/* Right controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex shrink-0 items-center justify-center bg-theme-bg text-theme-secondary hover:text-theme-primary border border-theme-border transition-all"
          >
            <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
          </button>

          {/* Desktop: Sign In / Profile button */}
          <div className="hidden sm:flex">
            {!user ? (
              <Link
                href="/sign-in"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-theme-accent text-white hover:opacity-90 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 shadow-md"
              >
                <i className="fas fa-right-to-bracket text-xs" />
                Sign In
              </Link>
            ) : (
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-theme-border bg-theme-surfaceElevated hover:bg-theme-bg hover:border-theme-accent transition-all duration-200"
              >
                <img
                  src={user.imageUrl}
                  alt="Profile"
                  className="w-7 h-7 rounded-full object-cover border border-theme-border"
                />
                <span className="text-sm font-bold text-theme-primary">
                  {user.firstName || user.username || 'Profile'}
                </span>
              </Link>
            )}
          </div>

          {/* Desktop: StaggeredMenu toggle */}
          <div className="hidden sm:flex">
            <StaggeredMenu
              position="right"
              items={MENU_ITEMS}
              displaySocials={false}
              displayItemNumbering={true}
              colors={underlayColors}
              accentColor={accentColor}
              menuButtonColor={menuBtnColor}
              openMenuButtonColor={menuBtnColor}
              changeMenuColorOnOpen={false}
              closeOnClickAway={true}
            />
          </div>
        </div>
      </header>
    </div>
  )
}
