'use client'

export default function ThemeToggle({ theme, onToggle, className = '' }) {
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      className={`group relative h-7 w-11 shrink-0 overflow-hidden rounded-full border border-theme-border bg-theme-surfaceElevated shadow-sm transition-all duration-300 hover:border-theme-accent/60 hover:shadow-md sm:h-8 sm:w-[54px] ${className}`}
    >
      <span className="sr-only">{isDark ? 'Light theme' : 'Dark theme'}</span>

      <span
        aria-hidden="true"
        className={`absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-theme-accent text-theme-accent-text shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition-transform duration-500 ease-out sm:h-6 sm:w-6 ${
          isDark ? 'translate-x-4 sm:translate-x-6' : 'translate-x-0'
        }`}
      >
        <span className="flex h-full w-full items-center justify-center">
          <i className={`fas ${isDark ? 'fa-moon' : 'fa-sun'} text-[10px] sm:text-[11px]`} />
        </span>
      </span>

      <span
        aria-hidden="true"
        className={`absolute top-1/2 h-1 w-1 -translate-y-1/2 rounded-full transition-colors ${
          isDark ? 'left-2.5 bg-theme-secondary/70 sm:left-3' : 'right-2.5 bg-theme-secondary/50 sm:right-3'
        }`}
      />
    </button>
  )
}
