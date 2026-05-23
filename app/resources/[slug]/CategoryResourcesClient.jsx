'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import ResourceCard from '@/components/resources/ResourceCard'
import ResourceViewer from '@/components/resources/ResourceViewer'

const tabs = [
  { id: '', label: 'All', icon: 'fa-layer-group' },
  { id: 'youtube', label: 'Videos', icon: 'fa-play' },
  { id: 'pdf', label: 'PDFs', icon: 'fa-file-pdf' },
  { id: 'link', label: 'Links', icon: 'fa-link' },
  { id: 'file', label: 'Files', icon: 'fa-file' },
]

const levelFilters = [
  { id: '', label: 'All Levels' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
]

const RESOURCE_PAGE_SIZE = 100

export default function CategoryResourcesClient({
  slug,
  initialCategories = [],
  initialResources = [],
  initialHasMoreResources = false,
  initialDataReady = false,
}) {
  const skippedInitialResourcesFetch = useRef(false)
  const [categories, setCategories] = useState(initialCategories)
  const [resources, setResources] = useState(initialResources)
  const [progress, setProgress] = useState([])
  const [selectedResource, setSelectedResource] = useState(null)
  const [activeType, setActiveType] = useState('')
  const [activeLevel, setActiveLevel] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(!initialDataReady && initialCategories.length === 0)
  const [loadingResources, setLoadingResources] = useState(!initialDataReady)
  const [loadingMoreResources, setLoadingMoreResources] = useState(false)
  const [hasMoreResources, setHasMoreResources] = useState(initialHasMoreResources)

  const refreshProgress = useCallback(async () => {
    try {
      const data = await fetch('/api/resources/progress', { cache: 'no-store' })
        .then((response) => response.json())
      if (Array.isArray(data)) setProgress(data)
    } catch {
      // Keep resource browsing usable if progress refresh fails.
    }
  }, [])

  useEffect(() => {
    let active = true
    const categoryRequest = initialCategories.length
      ? Promise.resolve(initialCategories)
      : fetch('/api/resources/categories').then((response) => response.json())

    Promise.all([
      categoryRequest,
      fetch('/api/resources/progress', { cache: 'no-store' }).then((response) => response.json()).catch(() => []),
    ]).then(([categoryData, progressData]) => {
      if (!active) return
      setCategories(Array.isArray(categoryData) ? categoryData : [])
      setProgress(Array.isArray(progressData) ? progressData : [])
      setLoading(false)
    }).catch(() => setLoading(false))

    return () => { active = false }
  }, [slug])

  const fetchResources = useCallback(async ({ offset = 0, append = false } = {}) => {
    const params = new URLSearchParams({
      category: slug,
      limit: String(RESOURCE_PAGE_SIZE),
      offset: String(offset),
    })
    if (activeType) params.set('type', activeType)
    if (activeLevel) params.set('level', activeLevel)
    const value = query.trim()
    if (value) params.set('q', value)

    append ? setLoadingMoreResources(true) : setLoadingResources(true)
    try {
      const response = await fetch(`/api/resources?${params.toString()}`)
      const data = await response.json()
      const items = Array.isArray(data) ? data : []
      setResources((current) => (append ? [...current, ...items] : items))
      setHasMoreResources(response.headers.get('X-Has-More') === 'true')
    } catch {
      if (!append) setResources([])
      setHasMoreResources(false)
    } finally {
      append ? setLoadingMoreResources(false) : setLoadingResources(false)
    }
  }, [activeLevel, activeType, query, slug])

  useEffect(() => {
    if (!skippedInitialResourcesFetch.current) {
      skippedInitialResourcesFetch.current = true
      if (initialDataReady && !activeType && !activeLevel && !query.trim()) return
    }

    fetchResources({ offset: 0 })
  }, [activeLevel, activeType, fetchResources, initialDataReady, query])

  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState !== 'hidden') refreshProgress()
    }

    window.addEventListener('pageshow', refreshProgress)
    window.addEventListener('focus', refreshProgress)
    document.addEventListener('visibilitychange', handleVisible)

    return () => {
      window.removeEventListener('pageshow', refreshProgress)
      window.removeEventListener('focus', refreshProgress)
      document.removeEventListener('visibilitychange', handleVisible)
    }
  }, [refreshProgress])

  const category = categories.find((item) => item.slug === slug)
  const categoryDescription = category?.description?.trim()
  const progressByResourceId = useMemo(() => new Map(progress.map((item) => [getProgressResourceId(item), item])), [progress])

  const filteredResources = resources

  const continueItems = progress
    .filter((item) => {
      const resource = item.resourceId
      return resource && typeof resource === 'object' && resource.type === 'youtube' && resource.categoryId?.slug === slug && !item.completed && item.progressSeconds > 0
    })
    .sort((a, b) => new Date(b.lastAccessedAt || b.updatedAt || 0) - new Date(a.lastAccessedAt || a.updatedAt || 0))
    .slice(0, 3)
    .map((item) => ({ ...item.resourceId, progressItem: item }))

  const onProgressSaved = (nextProgress) => {
    setProgress((current) => {
      const id = getProgressResourceId(nextProgress)
      return [nextProgress, ...current.filter((item) => getProgressResourceId(item) !== id)]
    })
  }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary page-enter">
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12 pb-28 space-y-8">
        <div className="flex items-center space-x-3">
          <Link href="/resources" aria-label="Back to resources" className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all shrink-0">
            <i className="fas fa-arrow-left" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-extrabold text-theme-primary">Resources</h1>
        </div>

        <section className="bg-theme-surface border border-theme-border rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 rounded-xl bg-theme-bg flex items-center justify-center shrink-0" style={{ color: category?.color || 'var(--color-accent)' }}>
                <i className={`fas ${category?.icon || 'fa-book-open'}`} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight truncate">{category?.name || 'Resources'}</h1>
                {categoryDescription ? (
                  <p className="text-theme-secondary mt-1 max-w-2xl truncate">{categoryDescription}</p>
                ) : null}
              </div>
            </div>
            <div className="relative w-full sm:w-[320px] lg:w-[360px] shrink-0">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-theme-secondary" />
              <input
                className="input-field pl-11 text-sm sm:text-base"
                style={{ paddingLeft: '2.75rem' }}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search inside category"
              />
            </div>
          </div>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveType(tab.id)}
              className={`px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap border transition-all ${activeType === tab.id ? 'bg-theme-accent text-white border-theme-accent' : 'bg-theme-surface border-theme-border text-theme-secondary hover:text-theme-primary'}`}
            >
              <i className={`fas ${tab.icon} mr-2`} />
              {tab.label}
            </button>
          ))}
        </div>

        {loading || loadingResources ? <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="skeleton h-56 rounded-2xl" />)}</section> : null}

        {!loading && !loadingResources && continueItems.length > 0 ? (
          <>
            <SectionTitle title="Continue Learning" subtitle="Your recent progress in this category." />
            <ResourceGrid resources={continueItems} allResources={resources} progressByResourceId={progressByResourceId} onOpen={setSelectedResource} />
          </>
        ) : null}

        {!loading && !loadingResources ? (
          <>
            <SectionTitle
              title={activeType ? tabs.find((tab) => tab.id === activeType)?.label : 'All Resources'}
              subtitle={`${filteredResources.length} item(s) available`}
              action={<LevelFilter activeLevel={activeLevel} onChange={setActiveLevel} />}
            />
            <ResourceGrid resources={filteredResources} allResources={resources} progressByResourceId={progressByResourceId} onOpen={setSelectedResource} />
            {filteredResources.length === 0 ? (
              <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 text-center text-theme-secondary">
                No resources found here yet.
              </div>
            ) : null}
            {hasMoreResources ? <LoadMoreButton loading={loadingMoreResources} onClick={() => fetchResources({ offset: resources.length, append: true })} /> : null}
          </>
        ) : null}
      </main>

      {selectedResource ? (
        <ResourceViewer
          resource={selectedResource}
          progress={progressByResourceId.get(selectedResource._id)}
          onClose={() => setSelectedResource(null)}
          onProgressSaved={onProgressSaved}
        />
      ) : null}
    </div>
  )
}

function ResourceGrid({ resources, allResources, progressByResourceId, onOpen }) {
  const serialMap = buildVisibleVideoSerialMap(resources, allResources || resources)

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {resources.map((resource) => (
        <ResourceCard
          key={resource._id}
          resource={resource}
          progress={resource.progressItem || progressByResourceId.get(resource._id)}
          serialNumber={serialMap.get(resource._id)}
          onOpen={onOpen}
        />
      ))}
    </section>
  )
}

function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold">{title}</h2>
        <p className="text-sm text-theme-secondary">{subtitle}</p>
      </div>
      {action ? <div className="sm:pb-0.5">{action}</div> : null}
    </div>
  )
}

function LevelFilter({ activeLevel, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {levelFilters.map((level) => (
        <button
          key={level.id}
          type="button"
          onClick={() => onChange(level.id)}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap border transition-all ${
            activeLevel === level.id
              ? 'bg-theme-accent text-white border-theme-accent'
              : 'bg-theme-surface border-theme-border text-theme-secondary hover:text-theme-primary'
          }`}
        >
          {level.label}
        </button>
      ))}
    </div>
  )
}

function LoadMoreButton({ loading, onClick }) {
  return (
    <div className="flex justify-center">
      <button
        onClick={onClick}
        disabled={loading}
        className="px-5 py-3 rounded-xl bg-theme-surface border border-theme-border text-sm font-bold text-theme-secondary hover:text-theme-primary disabled:opacity-60"
      >
        {loading ? 'Loading...' : 'Load More'}
      </button>
    </div>
  )
}

function getProgressResourceId(item) {
  return typeof item.resourceId === 'object' ? item.resourceId?._id : item.resourceId
}

function buildVisibleVideoSerialMap(visibleResources, orderedResources) {
  const map = new Map()
  let serialNumber = 1
  orderedResources
    .filter((resource) => resource.type === 'youtube')
    .forEach((resource) => {
      map.set(resource._id, serialNumber)
      serialNumber += 1
    })

  const visibleIds = new Set(visibleResources.map((resource) => resource._id))
  return new Map([...map].filter(([id]) => visibleIds.has(id)))
}
