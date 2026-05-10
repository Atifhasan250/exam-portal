'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function ProgressBar({ percent, completed, total }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    // Small timeout for entry animation
    const timer = setTimeout(() => {
      setWidth(percent)
    }, 100)
    return () => clearTimeout(timer)
  }, [percent])

  return (
    <div className="mb-10 flex flex-col sm:flex-row gap-4 items-end">
      <div className="flex-1 w-full">
        <div className="flex justify-between items-end mb-3 px-1">
          <span className="text-4xl font-extrabold text-theme-accent tracking-tighter">{percent}%</span>
          <span className="text-sm font-semibold text-theme-secondary">{completed}/{total} Completed</span>
        </div>
        <div className="h-6 rounded-full overflow-hidden border border-theme-border bg-theme-surfaceElevated shadow-inner relative">
          <div 
            className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-theme-primary to-theme-accent relative overflow-hidden"
            style={{ width: `${width}%` }}
          >
            {/* Subtle shine effect on the progress bar */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
          </div>
        </div>
      </div>
      
      <Link 
        href="/tasks/history"
        className="w-full sm:w-auto h-[48px] px-6 flex items-center justify-center gap-2 bg-theme-surface border border-theme-border rounded-xl text-theme-primary font-bold hover:bg-theme-surfaceElevated hover:border-theme-accent transition-all shrink-0 shadow-sm"
      >
        <i className="fas fa-history text-theme-accent" />
        History
      </Link>
    </div>
  )
}
