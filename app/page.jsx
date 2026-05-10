'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useTheme } from '@/context/ThemeContext'
import LaserFlow from '@/components/LaserFlow'

export default function HomePage() {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const { user } = hasClerk ? useUser() : { user: null }
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme flex flex-col page-enter">

      <main className="flex-grow flex items-center justify-center py-10 sm:py-16 px-4 mt-4 sm:mt-0">
        <div className="relative w-full max-w-6xl mx-auto">
          {/* Background Laser Flow */}
          <div className={`absolute top-[-250px] w-full h-[500px] pointer-events-none z-0 transition-opacity duration-700 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
            <LaserFlow
              color="#6366F1"
              horizontalBeamOffset={0.15}
              verticalBeamOffset={0}
              verticalSizing={1.2}
              horizontalSizing={0.8}
              flowSpeed={0.5}
              wispDensity={1.5}
              fogIntensity={0.6}
              dpr={1}
            />
          </div>

          <div
            className={`relative z-10 w-full rounded-[2rem] border overflow-hidden p-8 sm:p-16 mb-24 sm:mb-0 transition-all duration-500
              ${isDark
                ? 'border-[#B497CF]/30 bg-[#120F17]/80 backdrop-blur-md shadow-[0_-20px_60px_-15px_rgba(180,151,207,0.25)]'
                : 'border-theme-border bg-theme-bg shadow-xl'
              }
            `}
          >
            {/* Dotted Grid Background */}
            <div
              className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${isDark ? 'opacity-10' : 'opacity-[0.03]'}`}
              style={{
                backgroundImage: 'radial-gradient(#B497CF 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />

            {/* Top border glowing line */}
            <div
              className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#B497CF] to-transparent transition-opacity duration-500 ${isDark ? 'opacity-90' : 'opacity-40'}`}
            />

            <div className="text-center space-y-8 relative z-20">
              <div className="space-y-4">
                <h2 className="text-5xl font-extrabold text-theme-primary">IT Resource Zone</h2>
                <p className="text-lg text-theme-secondary max-w-xl mx-auto">
                  Welcome to the official exam and assessment platform. Take live exams in real-time or revisit past exams for practice. All in one place.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/exams" className="w-full sm:w-auto px-8 py-4 bg-theme-accent text-white font-bold rounded-xl hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-95 shadow-lg transition-all duration-300 flex items-center justify-center space-x-2">
                  <i className="fas fa-rocket" />
                  <span>Browse Exams</span>
                </Link>
                {hasClerk && !user ? (
                  <Link href="/sign-up" className="w-full sm:w-auto px-8 py-4 bg-theme-bg text-theme-primary border border-theme-border font-bold rounded-xl hover:-translate-y-1 hover:shadow-xl hover:border-theme-primary/40 hover:bg-theme-surface active:scale-95 shadow-sm transition-all duration-300 flex items-center justify-center space-x-2">
                    <i className="fas fa-user-plus" />
                    <span>Create Account</span>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
