import { NavLink } from 'react-router-dom'

export default function BottomNav() {
  const studentName = localStorage.getItem('student_name') || ''

  const navItems = [
    { to: '/', icon: 'fa-house', label: 'Home', exact: true },
    { to: '/exams', icon: 'fa-layer-group', label: 'Exams' },
    { to: '/leaderboard', icon: 'fa-trophy', label: 'Ranks' },
    ...(studentName ? [{ to: '/profile', icon: 'fa-user', label: 'Profile' }] : []),
  ]

  return (
    <nav className="sm:hidden fixed bottom-3 left-3 right-3 z-50">
      <div
        className="flex items-center justify-around px-2 py-1.5 rounded-2xl shadow-2xl"
        style={{
          background: 'color-mix(in srgb, var(--color-surface) 80%, transparent)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}
      >
        {navItems.map(({ to, icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-200 flex-1 ${
                isActive
                  ? 'bg-theme-accent text-white shadow-md scale-105'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`
            }
          >
            <i className={`fas ${icon} text-sm`}></i>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
