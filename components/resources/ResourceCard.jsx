'use client'

import Link from 'next/link'

export default function ResourceCard({ resource, progress, serialNumber, metaMode = 'default' }) {
  const progressSeconds = progress?.progressSeconds || 0
  const percent = progress?.completed
    ? 100
    : resource.durationSeconds
      ? Math.min(100, Math.round((progressSeconds / resource.durationSeconds) * 100))
      : 0
  const content = <CardContent resource={resource} percent={percent} serialNumber={serialNumber} metaMode={metaMode} />
  const href = resource.type === 'youtube'
    ? `/resources/watch/${publicResourceSlug(resource)}`
    : `/resources/view/${publicResourceSlug(resource)}`

  return (
    <article className="bg-theme-surface border border-theme-border rounded-2xl overflow-hidden shadow-sm hover:border-theme-accent/40 transition-all">
      <Link href={href} className="block w-full text-left">
        {content}
      </Link>
    </article>
  )
}

function CardContent({ resource, percent, serialNumber, metaMode }) {
  return (
    <>
      <div className="relative aspect-video bg-theme-bg overflow-hidden">
        {resource.thumbnailUrl ? (
          <img src={resource.thumbnailUrl} alt={`${resource.title} thumbnail`} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-theme-secondary">
            <i className={`fas ${iconForType(resource.type)} text-3xl`} />
          </div>
        )}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs font-bold">
          {labelForType(resource.type)}
        </span>
        {resource.type === 'youtube' ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-12 h-12 rounded-full bg-black/65 text-white flex items-center justify-center">
              <i className="fas fa-play ml-1" />
            </span>
          </span>
        ) : null}
      </div>
      {percent > 0 ? (
        <div className="h-1 bg-theme-bg">
          <div className="h-full bg-theme-accent" style={{ width: `${percent}%` }} />
        </div>
      ) : null}
      <div className="p-4">
        {metaMode === 'category' ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-theme-secondary font-bold mb-2">
            <span>{resource.categoryId?.name || 'Resources'}</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-xs text-theme-secondary font-bold mb-2">
          <span>{levelLabel(resource.level)}</span>
          <span>•</span>
          <span>{languageLabel(resource.language)}</span>
          {resource.durationSeconds ? (
            <>
              <span>•</span>
              <span>{formatDuration(resource.durationSeconds)}</span>
            </>
          ) : null}
          </div>
        )}
        <h3 className="font-extrabold text-theme-primary leading-snug flex items-start gap-1.5">
          {serialNumber ? <span className="text-theme-accent shrink-0">{serialNumber}.</span> : null}
          <span>{resource.title}</span>
        </h3>
      </div>
    </>
  )
}

function iconForType(type) {
  if (type === 'youtube') return 'fa-play'
  if (type === 'pdf') return 'fa-file-pdf'
  if (type === 'link') return 'fa-link'
  if (type === 'image') return 'fa-image'
  return 'fa-file'
}

function labelForType(type) {
  if (type === 'youtube') return 'Video'
  if (type === 'pdf') return 'PDF'
  if (type === 'link') return 'Link'
  if (type === 'image') return 'Image'
  return 'File'
}

function levelLabel(level) {
  if (level === 'intermediate') return 'Intermediate'
  if (level === 'advanced') return 'Advanced'
  return 'Beginner'
}

function languageLabel(language) {
  if (language === 'bn') return 'Bangla'
  if (language === 'en') return 'English'
  if (language === 'hi') return 'Hindi'
  if (language === 'mixed') return 'Mixed'
  return 'Other'
}

function formatDuration(seconds = 0) {
  const total = Number(seconds) || 0
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours) return `${hours}h ${minutes}m`
  return minutes ? `${minutes}m` : ''
}

function publicResourceSlug(resource) {
  if (resource?.slug) return resource.slug
  return `${slugify(resource?.title || 'resource')}-${slugify(resource?._id || '')}`.slice(0, 280)
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
