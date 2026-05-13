'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'
import Navbar from './Navbar'
import ClickSpark from './ClickSpark'
import { useTheme } from '@/context/ThemeContext'

const CHROMELESS_PREFIXES = ['/sign-in', '/sign-up']

const IMPORTANT_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/exams', label: 'All Exams' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/sign-in', label: 'Login' },
  { href: '/sign-up', label: 'Register' },
]

const RESOURCE_LINKS = [
  { href: '/exams', label: 'Mock Exams' },
  { href: '/leaderboard', label: "Toppers' Board" },
  { href: '/profile', label: 'My Profile' },
  { href: '/resources', label: 'Tutorials & Resources' },
]

const SOCIAL_LINKS = [
  {
    href: 'https://www.facebook.com/itresourcezone/',
    icon: 'fa-facebook-f',
    label: 'Facebook',
    color: '#1877F2',
  },
  {
    href: 'https://t.me/Itzonei',
    icon: 'fa-telegram',
    label: 'Telegram',
    color: '#26A5E4',
  },
]

export default function AppChrome({ children }) {
  const pathname = usePathname()
  const isChromeless = CHROMELESS_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const year = new Date().getFullYear()
  const { theme } = useTheme()

  // Lighter spark for dark bg, deeper for light bg
  const sparkColor = theme === 'dark' ? '#a5b4fc' : '#4338ca'

  return (
    <ClickSpark sparkColor={sparkColor} sparkSize={12} sparkRadius={20} sparkCount={8} duration={450}>
      <div className="flex flex-col min-h-screen bg-theme-bg text-theme-primary transition-theme">
        {!isChromeless && <Navbar />}
        <div className="flex-grow">{children}</div>

        {!isChromeless && (
          <footer className="border-t border-theme-border bg-theme-surface mt-auto pb-24 sm:pb-0">
            {/* Main footer grid */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

              {/* Brand column */}
              <div className="sm:col-span-2 lg:col-span-1 space-y-4">
                <Link href="/" className="inline-flex items-center space-x-2 group">
                  <Image
                    src="/favicon.png"
                    alt="IT Resource Zone Logo"
                    width={38}
                    height={38}
                    className="object-contain rounded-xl shadow-sm"
                  />
                  <span className="text-lg font-extrabold tracking-tight text-theme-primary group-hover:text-theme-accent transition-colors">
                    IT Resource Zone
                  </span>
                </Link>
                <p className="text-sm text-theme-secondary leading-relaxed max-w-xs">
                  Instant results, real-time exam scores and detailed analytics — we help students reach their brightest potential.
                </p>
                {/* Socials */}
                <div className="flex items-center space-x-2 pt-1">
                  {SOCIAL_LINKS.map(({ href, icon, label, color }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="w-9 h-9 rounded-xl border border-theme-border flex items-center justify-center text-theme-secondary hover:text-white hover:border-transparent transition-all duration-200 hover:scale-110"
                      style={{ '--social-color': color }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = color
                        e.currentTarget.style.borderColor = color
                        e.currentTarget.style.color = '#fff'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = ''
                        e.currentTarget.style.borderColor = ''
                        e.currentTarget.style.color = ''
                      }}
                    >
                      <i className={`fab ${icon} text-sm`} />
                    </a>
                  ))}
                </div>
              </div>

              {/* Important Links */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-theme-primary">
                  Important Links
                </h3>
                <ul className="space-y-2">
                  {IMPORTANT_LINKS.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-sm text-theme-secondary hover:text-theme-accent hover:translate-x-1 inline-flex items-center gap-1.5 transition-all duration-200"
                      >
                        <i className="fas fa-chevron-right text-[9px] text-theme-accent opacity-70" />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-theme-primary">
                  Resources
                </h3>
                <ul className="space-y-2">
                  {RESOURCE_LINKS.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-sm text-theme-secondary hover:text-theme-accent hover:translate-x-1 inline-flex items-center gap-1.5 transition-all duration-200"
                      >
                        <i className="fas fa-chevron-right text-[9px] text-theme-accent opacity-70" />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact / Extra info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-theme-primary">
                  Contact
                </h3>
                <ul className="space-y-3 text-sm text-theme-secondary">
                  <li className="flex items-start gap-2">
                    <i className="fas fa-envelope text-theme-accent mt-0.5 shrink-0" />
                    <a href="mailto:itresourcezone@gmail.com" className="hover:text-theme-accent transition-colors break-all">
                      itresourcezone@gmail.com
                    </a>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fas fa-code-branch text-theme-accent mt-0.5 shrink-0" />
                    <span>
                      Made by{' '}
                      <a
                        href="https://atifs-portfolio.vercel.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-theme-primary hover:text-theme-accent transition-colors underline underline-offset-2"
                      >
                        Atif Hasan
                      </a>
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-theme-border">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-theme-secondary">
                <span>© {year} IT Resource Zone. All rights reserved.</span>
                <div className="flex items-center gap-4">
                  <Link href="/privacy" className="hover:text-theme-accent transition-colors">
                    Privacy Policy
                  </Link>
                  <span className="text-theme-border">|</span>
                  <Link href="/terms" className="hover:text-theme-accent transition-colors">
                    Terms of Service
                  </Link>
                </div>
              </div>
            </div>
          </footer>
        )}

        {!isChromeless ? <BottomNav /> : null}
      </div>
    </ClickSpark>
  )
}
