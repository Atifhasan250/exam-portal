'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import Navbar from '@/components/Navbar'

export default function HomePage() {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const { user } = hasClerk ? useUser() : { user: null }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme flex flex-col page-enter">
      <Navbar />

      <main className="flex-grow flex items-center justify-center py-10 sm:py-20 px-4">
        <div className="text-center space-y-8 max-w-2xl mb-24 sm:mb-0">
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
      </main>
    </div>
  )
}
