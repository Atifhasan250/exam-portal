'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // In production, this is where Sentry.captureException(error) would go
    if (process.env.NODE_ENV === 'development') {
      console.error('[GlobalError]', error)
    }
  }, [error])

  return (
    <div className="bg-theme-bg min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center bg-theme-surface border border-theme-border rounded-2xl p-8 shadow-sm page-enter">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-exclamation-triangle text-red-500 text-2xl" />
        </div>
        <h1 className="text-3xl font-extrabold text-theme-primary mb-2">
          Something went wrong
        </h1>
        <p className="text-theme-secondary mb-6">
          An unexpected error occurred. Please try again or return to the home page.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center px-6 py-3 rounded-xl bg-theme-accent text-white font-bold hover:opacity-90 transition-all"
          >
            <i className="fas fa-redo mr-2" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 rounded-xl bg-theme-bg border border-theme-border text-theme-primary font-bold hover:border-theme-accent transition-all"
          >
            <i className="fas fa-home mr-2" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
