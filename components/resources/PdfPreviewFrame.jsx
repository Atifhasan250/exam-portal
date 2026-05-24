'use client'

import { useEffect, useState } from 'react'

export default function PdfPreviewFrame({ title, src, thumbnailUrl }) {
  const [blocked, setBlocked] = useState(false)
  const previewSrc = getCleanPdfPreviewUrl(src)

  useEffect(() => {
    setBlocked(!previewSrc)
  }, [previewSrc])

  if (blocked) {
    return (
      <div className="min-h-[320px] sm:min-h-[520px] bg-theme-bg flex flex-col items-center justify-center gap-4 p-6 text-center">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={`${title} preview`} className="max-h-[420px] max-w-full rounded-xl object-contain shadow-xl" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-theme-surface border border-theme-border flex items-center justify-center text-theme-accent">
            <i className="fas fa-file-pdf text-2xl" />
          </div>
        )}
        <div>
          <h2 className="text-xl font-extrabold">{title}</h2>
          <p className="mt-1 text-sm text-theme-secondary">Preview is unavailable here. Open the PDF in a new tab.</p>
        </div>
      </div>
    )
  }

  return (
    <iframe
      title={title}
      src={previewSrc}
      onError={() => setBlocked(true)}
      className="h-[34vh] min-h-[220px] max-h-[280px] w-full bg-theme-bg sm:h-[58vh] sm:min-h-[360px] sm:max-h-[620px]"
    />
  )
}

function getCleanPdfPreviewUrl(src) {
  const value = String(src || '')
  if (!value) return ''

  const [base] = value.split('#')
  return `${base}#toolbar=0&navpanes=0&scrollbar=1&view=Fit`
}
