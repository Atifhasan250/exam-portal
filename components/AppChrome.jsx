'use client'

import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'

const CHROMELESS_PREFIXES = ['/sign-in', '/sign-up']

export default function AppChrome({ children }) {
  const pathname = usePathname()
  const isChromeless = CHROMELESS_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  return (
    <div className="flex flex-col min-h-screen bg-theme-bg text-theme-primary transition-theme">
      <div className="flex-grow">{children}</div>
      {!isChromeless ? (
        <footer className="text-center pt-6 pb-24 sm:pb-6 px-4 text-sm text-theme-secondary border-t border-theme-border bg-theme-bg mt-auto">
          &copy; 2026 IT Resource Zone | Made by{' '}
          <a
            href="https://atifs-portfolio.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-theme-primary hover:text-theme-accent transition-colors underline"
          >
            Atif Hasan
          </a>
        </footer>
      ) : null}
      {!isChromeless ? <BottomNav /> : null}
    </div>
  )
}
