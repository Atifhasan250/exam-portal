'use client'

import { useEffect } from 'react'

let lockCount = 0
let previousBodyOverflow = ''
let previousHtmlOverflow = ''

export default function PageLoadingOverlay({ children, className = '' }) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    if (lockCount === 0) {
      previousBodyOverflow = document.body.style.overflow
      previousHtmlOverflow = document.documentElement.style.overflow
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    }

    lockCount += 1

    return () => {
      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0) {
        document.body.style.overflow = previousBodyOverflow
        document.documentElement.style.overflow = previousHtmlOverflow
      }
    }
  }, [])

  return (
    <div
      aria-busy="true"
      aria-label="Loading page"
      className={`fixed inset-0 z-[99999] overflow-hidden overscroll-none touch-none bg-theme-bg text-theme-primary transition-theme ${className}`}
      role="status"
    >
      <div className="h-full w-full overflow-hidden">
        {children}
      </div>
    </div>
  )
}
