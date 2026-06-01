'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useUser } from '@clerk/nextjs'
import { useTheme } from '@/context/ThemeContext'
import PageSkeleton from './PageSkeleton'
import StaggeredMenu from './StaggeredMenu'
import ThemeToggle from './ThemeToggle'

const MENU_ITEMS = [
  { label: 'Home',        ariaLabel: 'Go to home page',       link: '/' },
  { label: 'Exams',       ariaLabel: 'Browse all exams',       link: '/exams' },
  { label: 'Dashboard',   ariaLabel: 'View your dashboard',    link: '/dashboard' },
  { label: 'Leaderboard', ariaLabel: 'View leaderboard',       link: '/leaderboard' },
  { label: 'Tasks',       ariaLabel: 'View tasks',             link: '/tasks' },
  { label: 'Resources',   ariaLabel: 'View resources',         link: '/resources' },
  { label: 'Profile',     ariaLabel: 'View your profile',      link: '/profile' },
]

export default function Navbar({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const { user, isLoaded } = useUser()

  // Theme-aware StaggeredMenu colours
  const isDark = theme === 'dark'
  const menuBtnColor   = isDark ? '#E8EAF6' : '#081126'
  const accentColor    = isDark ? '#6366F1' : '#ea7a53'
  const underlayColors = isDark
    ? ['#1E2A48', '#0F1524']
    : ['#f6eecf', '#fff8e7']

  if (!isLoaded) return <div className={className}><PageSkeleton /></div>

  return (
    <div className={`sticky top-2.5 sm:top-2.5 z-[9999] px-4 transition-theme pointer-events-none ${className}`}>
      <header
        className="relative max-w-6xl mx-auto backdrop-blur-xl border border-theme-border rounded-2xl shadow-lg h-16 flex items-center justify-between px-4 sm:px-6 pointer-events-auto"
        style={{ background: 'color-mix(in srgb, var(--color-surface) 70%, transparent)' }}
      >
        {/* Left controls */}
        <div className="flex items-center shrink-0">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>

        {/* Center logo */}
        <Link
          href="/"
          aria-label="Go to home page"
          className="absolute left-1/2 top-1/2 flex h-14 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden cursor-pointer sm:h-16 sm:w-20"
        >
          <Image
            src={isDark ? '/favicon.png' : '/favicon1.png'}
            alt="IT Resource Zone"
            width={80}
            height={80}
            className="h-16 w-16 shrink-0 object-contain drop-shadow-sm sm:h-20 sm:w-20"
          />
        </Link>

        {/* Right controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Desktop: Sign In / Profile button */}
          <div className="hidden sm:flex">
            {!user ? (
              <Link
                href="/sign-in"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-theme-accent text-theme-accent-text hover:opacity-90 hover:shadow-lg hover:shadow-theme-accent/30 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 shadow-md"
              >
                <i className="fas fa-right-to-bracket text-xs" />
                Sign In
              </Link>
            ) : (
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-theme-border bg-theme-surfaceElevated hover:bg-theme-bg hover:border-theme-accent transition-all duration-200"
              >
                <Image
                  src={user.imageUrl}
                  alt="Profile"
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-full object-cover border border-theme-border"
                />
                <span className="text-sm font-bold text-theme-primary">
                  {user.firstName || user.username || 'Profile'}
                </span>
              </Link>
            )}
          </div>

          {/* Menu toggle */}
          <div className="flex">
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
              mobileCompact={true}
            />
          </div>
        </div>
      </header>
    </div>
  )
}
