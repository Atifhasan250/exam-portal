'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useEffect, useRef } from 'react'

export default function BottomNav() {
  const pathname = usePathname()
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const { user } = hasClerk ? useUser() : { user: null }
  const navRef = useRef(null)
  const pillRef = useRef(null)

  const navItems = [
    { to: '/', icon: 'fa-house', label: 'Home', exact: true },
    { to: '/exams', icon: 'fa-layer-group', label: 'Exams' },
    { to: '/leaderboard', icon: 'fa-trophy', label: 'Ranks' },
    { to: '/profile', icon: 'fa-user', label: 'Profile' },
  ]

  useEffect(() => {
    if (!navRef.current || !pillRef.current) return

    const activeEl = navRef.current.querySelector('[data-active="true"]')
    if (!activeEl) return

    const navRect = navRef.current.getBoundingClientRect()
    const itemRect = activeEl.getBoundingClientRect()
    pillRef.current.style.width = `${itemRect.width}px`
    pillRef.current.style.transform = `translateX(${itemRect.left - navRect.left}px)`
  }, [pathname, user])

  if (pathname.startsWith('/admin') || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || /^\/exam\/[^/]+$/.test(pathname)) {
    return null
  }

  return (
    <nav className="sm:hidden fixed bottom-3 left-3 right-3 z-50">
      <div
        ref={navRef}
        className="relative flex items-center justify-around px-2 py-1.5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] backdrop-blur-xl border border-theme-border"
        style={{ background: 'color-mix(in srgb, var(--color-surface) 70%, transparent)' }}
      >
        <span
          ref={pillRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '6px',
            left: 0,
            height: 'calc(100% - 12px)',
            borderRadius: '12px',
            background: 'var(--color-accent)',
            transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        {navItems.map(({ to, icon, label, exact }) => {
          const isActive = exact ? pathname === to : pathname.startsWith(to)
          return (
            <Link
              key={to}
              href={to}
              data-active={isActive ? 'true' : 'false'}
              className="relative z-10 flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-colors duration-200 flex-1"
              style={{ color: isActive ? 'var(--color-accent-text)' : 'var(--color-secondary)' }}
            >
              <i className={`fas ${icon} text-sm`} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
