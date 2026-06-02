'use client'

import { useState } from 'react'
import ResourceQuizButton from '@/components/resources/ResourceQuizButton'
import ResourceAiAssistant from '@/components/resources/ResourceAiAssistant'

export default function ResourceWatchTabs({ resource }) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <aside className="bg-theme-surface border border-theme-border rounded-2xl overflow-hidden lg:sticky lg:top-24">
      <div className="border-b border-theme-border">
        <nav className="grid grid-cols-2 bg-theme-bg/50 p-2">
          <TabButton
            active={activeTab === 'overview'}
            icon="fa-circle-info"
            label="Overview"
            onClick={() => setActiveTab('overview')}
          />
          <TabButton
            active={activeTab === 'ai'}
            icon="fa-wand-magic-sparkles"
            label="AI Assistant"
            onClick={() => setActiveTab('ai')}
          />
        </nav>
      </div>

      <div className="min-w-0 p-5">
        {activeTab === 'overview' ? <OverviewPanel resource={resource} /> : <ResourceAiAssistant resource={resource} />}
      </div>
    </aside>
  )
}

function TabButton({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-xl px-3 text-sm font-bold transition-all ${
        active
          ? 'bg-theme-accent text-theme-accent-text shadow-lg shadow-theme-accent/20'
          : 'text-theme-secondary hover:bg-theme-surface hover:text-theme-primary'
      }`}
    >
      <span className="flex items-center justify-center gap-2">
        <i className={`fas ${icon} text-sm`} />
        <span className="leading-tight">{label}</span>
      </span>
    </button>
  )
}

function OverviewPanel({ resource }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-theme-accent">Video</p>
          <h2 className="text-lg font-extrabold leading-snug">{resource.title}</h2>
          {resource.channelTitle ? <p className="text-sm text-theme-secondary">{resource.channelTitle}</p> : null}
        </div>
        <ResourceQuizButton resourceSlug={resource.slug} quizQuestionCount={resource.quizQuestionCount} />
      </div>
      <Detail label="Level" value={levelLabel(resource.level)} />
      <Detail label="Language" value={languageLabel(resource.language)} />
      <Detail label="Duration" value={formatDuration(resource.durationSeconds)} />
      <Detail label="Category" value={resource.categoryId?.name || 'Resources'} />
      {resource.description ? (
        <p className="border-t border-theme-border pt-3 text-sm leading-relaxed text-theme-secondary whitespace-pre-line">
          {resource.description}
        </p>
      ) : null}
      <div className="pt-2">
        <p className="text-xs font-bold uppercase tracking-wide text-theme-secondary mb-2">Video Link</p>
        <a href={resource.url} target="_blank" rel="noreferrer" className="text-sm text-theme-accent break-all hover:underline">
          {resource.url}
        </a>
      </div>
    </div>
  )
}

function Detail({ label, value }) {
  if (!value) return null

  return (
    <div className="flex items-center justify-between gap-4 border-t border-theme-border pt-3">
      <span className="text-sm text-theme-secondary">{label}</span>
      <span className="text-sm font-bold text-theme-primary text-right">{value}</span>
    </div>
  )
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
