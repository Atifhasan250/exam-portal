'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-theme-bg text-theme-primary transition-theme px-4 py-10 flex items-center justify-center">
      <main className="w-full max-w-md bg-theme-surface border border-theme-border rounded-2xl p-7 sm:p-8 shadow-xl text-center">
        <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-theme-bg border border-theme-border flex items-center justify-center">
          <Image
            src="/icons/icon-192.png"
            alt="IT Resource Zone"
            width={56}
            height={56}
            className="rounded-xl"
            priority
          />
        </div>

        <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] font-extrabold text-theme-accent bg-theme-bg border border-theme-border px-3 py-1.5 rounded-full">
          Offline
        </span>

        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-theme-primary">
          Connection needed
        </h1>
        <p className="mt-3 text-sm sm:text-base text-theme-secondary leading-relaxed">
          Live exams, sign-in, resources, notifications, and progress sync need internet. Reconnect, then retry from the app.
        </p>

        <div className="mt-7 grid gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-theme-accent text-theme-accent-text font-bold shadow-lg hover:opacity-90 active:scale-95 transition-all"
          >
            Retry
          </button>
          <Link
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-theme-bg text-theme-primary border border-theme-border font-bold hover:border-theme-accent/50 active:scale-95 transition-all"
          >
            Home
          </Link>
        </div>
      </main>
    </div>
  )
}
