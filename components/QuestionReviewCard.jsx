'use client'

import { useState } from 'react'
import { safeHTML } from '@/utils/sanitize'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E']

export default function QuestionReviewCard({ question, index, userAnswer, total }) {
  const [showExplanation, setShowExplanation] = useState(false)
  const isCorrect = userAnswer === question.correct
  const notAnswered = userAnswer === undefined || userAnswer === null

  return (
    <div className="bg-theme-surface border border-theme-border rounded-2xl overflow-hidden shadow-sm">
      {/* Question header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div
            className="flex-1 text-theme-primary font-semibold text-sm sm:text-base leading-relaxed whitespace-pre-wrap [&_p]:m-0 [&_p]:inline"
            dangerouslySetInnerHTML={{ __html: safeHTML(`${index + 1}. ${question.question}`) }}
          />
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${isCorrect ? 'bg-theme-success-bg text-theme-success-text' : notAnswered ? 'bg-theme-bg text-theme-secondary border border-theme-border' : 'bg-theme-error-bg text-theme-error-text'}`}>
              {isCorrect ? '1' : '0'}/{total ? 1 : 1}
            </span>
          </div>
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {question.options.map((option, i) => {
            const isUserChoice = userAnswer === i
            const isCorrectChoice = question.correct === i

            let optionClass = 'flex items-center gap-3 p-3 rounded-xl border text-sm transition-all '
            let dotClass = 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 '

            if (isCorrectChoice) {
              optionClass += 'bg-theme-success-bg border-theme-success-border '
              dotClass += 'bg-theme-success-text text-white '
            } else if (isUserChoice && !isCorrectChoice) {
              optionClass += 'bg-theme-error-bg border-theme-error-border '
              dotClass += 'bg-theme-error-text text-white '
            } else {
              optionClass += 'bg-theme-bg border-theme-border opacity-60 '
              dotClass += 'bg-theme-surface text-theme-secondary border border-theme-border '
            }

            return (
              <div key={i} className={optionClass}>
                <span className={dotClass}>{OPTION_LABELS[i] || i + 1}</span>
                <span
                  className={`leading-snug whitespace-pre-wrap [&_p]:m-0 [&_p]:inline ${isCorrectChoice ? 'text-theme-success-text font-semibold' : isUserChoice ? 'text-theme-error-text font-semibold' : 'text-theme-secondary'}`}
                  dangerouslySetInnerHTML={{ __html: safeHTML(option) }}
                />
                {isCorrectChoice && (
                  <i className="fas fa-check-circle text-theme-success-text ml-auto shrink-0" />
                )}
                {isUserChoice && !isCorrectChoice && (
                  <i className="fas fa-times-circle text-theme-error-text ml-auto shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Explanation */}
      {question.explanation ? (
        <div>
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="w-full flex items-center justify-between px-5 py-3 bg-theme-success-bg border-t border-theme-success-border text-theme-success-text text-sm font-bold hover:opacity-80 transition-opacity"
          >
            <span className="flex items-center gap-2">
              <i className="fas fa-circle-check" />
              Explanation
            </span>
            <i className={`fas fa-chevron-${showExplanation ? 'up' : 'down'} text-xs`} />
          </button>
          {showExplanation && (
            <div className="bg-theme-success-bg border-t border-theme-success-border px-5 py-4 opacity-90">
              <div
                className="text-sm text-theme-primary leading-relaxed whitespace-pre-wrap [&_p]:m-0 [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-3"
                dangerouslySetInnerHTML={{ __html: safeHTML(question.explanation) }}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
