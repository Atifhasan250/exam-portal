import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

export default function BottomNav() {
  const [studentName, setStudentName] = useState(() => localStorage.getItem('student_name') || '')
  const location = useLocation()
  const navRef = useRef(null)
  const pillRef = useRef(null)

  // React to external student_name changes (e.g. from HomePage, ExamsPage)
  useEffect(() => {
    const handler = () => setStudentName(localStorage.getItem('student_name') || '')
    window.addEventListener('student_name_changed', handler)
    return () => window.removeEventListener('student_name_changed', handler)
  }, [])

  const navItems = [
    { to: '/', icon: 'fa-house', label: 'Home', exact: true },
    { to: '/exams', icon: 'fa-layer-group', label: 'Exams' },
    { to: '/leaderboard', icon: 'fa-trophy', label: 'Ranks' },
    ...(studentName ? [{ to: '/profile', icon: 'fa-user', label: 'Profile' }] : []),
  ]

  // Slide the pill to the active nav item
  useEffect(() => {
    if (!navRef.current || !pillRef.current) return
    const activeEl = navRef.current.querySelector('[data-active="true"]')
    if (!activeEl) return
    const navRect = navRef.current.getBoundingClientRect()
    const itemRect = activeEl.getBoundingClientRect()
    pillRef.current.style.width = `${itemRect.width}px`
    pillRef.current.style.transform = `translateX(${itemRect.left - navRect.left}px)`
  }, [location.pathname, studentName])

  // Don't show BottomNav on Admin routes or Exam (taking) routes
  if (location.pathname.startsWith('/admin') || location.pathname.match(/^\/exam\/[^/]+$/)) {
    return null
  }

  return (
    <nav className="sm:hidden fixed bottom-3 left-3 right-3 z-50">
      <div
        ref={navRef}
        className="relative flex items-center justify-around px-2 py-1.5 rounded-2xl shadow-2xl"
        style={{
          background: 'color-mix(in srgb, var(--color-surface) 80%, transparent)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}
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
          const isActive = exact ? location.pathname === to : location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              end={exact}
              data-active={isActive ? 'true' : 'false'}
              className="relative z-10 flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-colors duration-200 flex-1"
              style={{ color: isActive ? '#ffffff' : 'var(--color-secondary)' }}
            >
              <i className={`fas ${icon} text-sm`}></i>
              <span>{label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
