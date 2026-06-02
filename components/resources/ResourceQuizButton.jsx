'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'

export default function ResourceQuizButton({
  resourceSlug,
  quizQuestionCount = 0,
  className = '',
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const hasQuiz = Number(quizQuestionCount) > 0
  const buttonClassName = className || 'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-theme-accent bg-theme-accent/10 px-4 text-sm font-bold text-theme-accent transition-all hover:bg-theme-accent hover:text-theme-accent-text disabled:cursor-not-allowed disabled:border-theme-border disabled:bg-theme-bg disabled:text-theme-secondary disabled:hover:bg-theme-bg'

  useEffect(() => {
    setMounted(true)
  }, [])

  const openQuiz = () => {
    const currentPath = `${window.location.pathname}${window.location.search}`
    router.push(`/quiz/${resourceSlug}?from=${encodeURIComponent(currentPath)}`)
  }

  return (
    <>
      <button
        type="button"
        disabled={!hasQuiz}
        onClick={() => setOpen(true)}
        className={buttonClassName}
        title={hasQuiz ? 'Take quiz' : 'No quiz questions added for this resource'}
      >
        <i className="fas fa-list-check text-xs" />
        <span>Take Quiz</span>
      </button>

      {open && mounted ? createPortal(
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm modal-backdrop">
          <div className="w-full max-w-sm rounded-2xl border border-theme-border bg-theme-surface p-6 text-center shadow-2xl modal-panel">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-theme-accent/20 bg-theme-accent/10 text-theme-accent">
              <i className="fas fa-list-check text-xl" />
            </div>
            <h3 className="mb-2 text-xl font-black text-theme-primary">Start Quiz?</h3>
            <p className="mb-6 text-sm text-theme-secondary">Do you want to start quiz of this resource now?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 rounded-xl border border-theme-border bg-theme-bg font-bold text-theme-primary transition-all hover:border-theme-primary/30"
              >
                No
              </button>
              <button
                type="button"
                onClick={openQuiz}
                className="h-11 rounded-xl bg-theme-accent font-bold text-theme-accent-text transition-all hover:opacity-90"
              >
                Yes
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
