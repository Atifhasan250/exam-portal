'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useEffect, useRef } from 'react'

export default function BottomNav() {
  const pathname = usePathname()
  const { user } = useUser()
  const navRef = useRef(null)
  const pillRef = useRef(null)

  const navItems = [
    { to: '/', icon: 'fa-house', label: 'Home', exact: true },
    { to: '/exams', icon: 'fa-layer-group', label: 'Exams' },
    { to: '/tasks', icon: 'fa-list-check', label: 'Tasks' },
    { to: '/resources', icon: 'fa-book-open', label: 'Resources' },
    { to: '/profile', icon: 'fa-user', label: 'Profile' },
  ]

  useEffect(() => {
    if (!navRef.current || !pillRef.current) return

    const activeEl = navRef.current.querySelector('[data-active="true"]')
    if (!activeEl) {
      pillRef.current.style.opacity = '0'
      return
    }

    const isTasks = pathname.startsWith('/tasks')
    pillRef.current.style.opacity = isTasks ? '0' : '1'

    const navRect = navRef.current.getBoundingClientRect()
    const itemRect = activeEl.getBoundingClientRect()
    pillRef.current.style.width = `${itemRect.width}px`
    pillRef.current.style.transform = `translateX(${itemRect.left - navRect.left}px)`
  }, [pathname, user])

  if (pathname.startsWith('/admin') || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || /^\/exam\/[^/]+$/.test(pathname)) {
    return null
  }

  return (
    <nav className="sm:hidden fixed bottom-2.5 left-3 right-3 z-50">
      <div className="relative w-full">
        {/* SVG Mask Definition for Smooth Cutout */}
        <svg width="0" height="0" className="absolute pointer-events-none">
          <defs>
            <mask id="smooth-cutout">
              <rect width="100%" height="100%" fill="white" />
              <svg x="50%" y="0" overflow="visible">
                <path
                  d="M -44 0 C -24 0 -32 35 0 35 C 32 35 24 0 44 0 Z"
                  fill="black"
                />
              </svg>
            </mask>
          </defs>
        </svg>

        {/* Navbar Background with Safe CSS Gradient Mask */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ filter: 'drop-shadow(0 -1px 0 var(--color-border))' }}
        >
          <div
            className="w-full h-full rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] backdrop-blur-xl"
            style={{
              background: 'color-mix(in srgb, var(--color-surface) 85%, transparent)',
              boxShadow: 'inset 0 -1px 0 var(--color-border), inset 1px 0 0 var(--color-border), inset -1px 0 0 var(--color-border)',
              maskImage: 'radial-gradient(circle at 50% 4px, transparent 32px, black 33px)',
              WebkitMaskImage: 'radial-gradient(circle at 50% 4px, transparent 32px, black 33px)'
            }}
          />
        </div>

        {/* Navbar Content */}
        <div
          ref={navRef}
          className="relative flex items-center justify-between px-2 py-2"
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
              transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
              pointerEvents: 'none',
              zIndex: 0,
              opacity: 0,
            }}
          />
          {navItems.map(({ to, icon, label, exact }) => {
            const isActive = exact ? pathname === to : pathname.startsWith(to)

            // Special FAB-style rendering for Tasks (center item)
            if (to === '/tasks') {
              return (
                <Link key={to} href={to} data-active={isActive ? 'true' : 'false'} className="relative z-20 flex flex-col items-center justify-end pb-1 h-[46px] w-[80px] shrink-0">
                  {/* Floating Action Button */}
                  <div
                    className={`absolute -top-8 w-[56px] h-[56px] rounded-full flex items-center justify-center border transition-all duration-300 ${isActive ? 'bg-theme-accent text-white border-theme-accent' : 'bg-theme-surface text-theme-primary border-theme-border'
                      }`}
                  >
                    <i className={`fas ${icon} text-xl`} />
                  </div>

                  {/* Text visible in the navbar below the FAB */}
                  <span
                    className="text-[11px] font-bold mt-auto transition-colors z-10 translate-y-1"
                    style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-secondary)' }}
                  >
                    {label}
                  </span>
                </Link>
              )
            }

            return (
              <Link
                key={to}
                href={to}
                data-active={isActive ? 'true' : 'false'}
                className="relative z-10 flex flex-col items-center justify-end pb-1 h-[46px] gap-1 rounded-xl text-[11px] font-bold transition-colors duration-200 flex-1"
                style={{ color: isActive ? 'var(--color-accent-text)' : 'var(--color-secondary)' }}
              >
                <i className={`fas ${icon} text-[15px] mb-0.5`} />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
