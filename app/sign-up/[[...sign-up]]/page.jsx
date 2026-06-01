'use client'

import Link from 'next/link'
import Image from 'next/image'
import { SignUp } from '@clerk/nextjs'
import { useTheme } from '@/context/ThemeContext'
import { clerkAppearance } from '@/lib/clerkTheme'
import ThemeToggle from '@/components/ThemeToggle'

export default function SignUpPage() {
  const { theme, toggleTheme } = useTheme()
  const logoSrc = theme === 'dark' ? '/favicon.png' : '/favicon1.png'

  return (
    <div className="bg-theme-bg min-h-[100dvh] flex flex-col px-4 pt-24 pb-8 sm:p-12 transition-theme relative overflow-y-auto overflow-x-hidden">
      {theme === 'dark' ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.20),_transparent_30%),radial-gradient(circle_at_15%_20%,_rgba(52,211,153,0.08),_transparent_20%),linear-gradient(180deg,_rgba(15,21,36,0.98),_rgba(7,10,20,1))]" />
          <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(90deg,transparent,rgba(99,102,241,0.12),transparent)] blur-3xl" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_25%,_rgba(234,122,83,0.16),_transparent_45%),radial-gradient(circle_at_20%_75%,_rgba(8,17,38,0.05),_transparent_40%)]" />
          <div className="absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(234,122,83,0.10),transparent)] blur-2xl" />
        </>
      )}

      {/* Back Button */}
      <Link href="/" className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50 flex items-center gap-2 text-theme-secondary hover:text-theme-primary bg-theme-surface/80 hover:bg-theme-surface backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-theme-border shadow-sm transition-all text-sm font-semibold">
        <i className="fas fa-arrow-left" />
        <span className="hidden sm:inline">Back to Home</span>
      </Link>

      <div className="relative w-full max-w-5xl mx-auto my-auto grid lg:grid-cols-[1.02fr_0.98fr] gap-6 lg:gap-8 items-center shrink-0">
        <div className="hidden lg:block">
          <div className="max-w-md">
            <Link href="/" className="inline-flex items-center gap-3 mb-8">
              <Image src={logoSrc} alt="Logo" width={56} height={56} className="object-contain" />
              <p className="text-4xl font-black text-theme-primary leading-tight">IT Resource Zone</p>
            </Link>
            <p className="text-base text-theme-secondary leading-8">
              Join once, then use the same profile for live exams, practice attempts, and your submission history across devices.
            </p>
            <div className="mt-8 flex items-center gap-3 text-sm text-theme-secondary">
              <span className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-accent">
                <i className="fas fa-chart-line" />
              </span>
              <span>Track scores, rankings, and progress with your own account</span>
            </div>
          </div>
        </div>

        <div className="relative w-full min-w-0 max-w-[560px] mx-auto">
          <div className="bg-theme-surface/95 backdrop-blur-xl border border-theme-border rounded-2xl sm:rounded-[28px] lg:rounded-[30px] shadow-[0_12px_40px_rgba(0,0,0,0.10)] dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)] p-5 sm:p-7 lg:p-8 overflow-visible">
            <div className="flex items-center justify-between gap-4 mb-6 lg:mb-7">
              <div className="min-w-0">
                <Link href="/" className="lg:hidden inline-flex items-center gap-3 mb-4">
                  <Image src={logoSrc} alt="Logo" width={48} height={48} className="object-contain" />
                  <span className="text-lg font-extrabold text-theme-primary">IT Resource Zone</span>
                </Link>
                <h1 className="text-2xl sm:text-3xl font-black text-theme-primary">Create Account</h1>
                <p className="text-theme-secondary text-sm sm:text-base mt-1">Join to track your exam scores</p>
              </div>
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>

            <div className="auth-clerk w-full mt-2 sm:mt-4">
              <SignUp
                appearance={clerkAppearance}
                fallbackRedirectUrl="/profile"
                signInUrl="/sign-in"
              />
            </div>
          </div>

          {/* Footer Text */}
          <div className="mt-6 text-center">
            <p className="text-theme-secondary text-sm">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-theme-accent font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
