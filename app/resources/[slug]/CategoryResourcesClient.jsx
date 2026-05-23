'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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

export default function CategoryResourcesClient({ slug }) {
  const [categories, setCategories] = useState([])
  const [resources, setResources] = useState([])
  const [progress, setProgress] = useState([])
  const [selectedResource, setSelectedResource] = useState(null)
  const [activeType, setActiveType] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

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
    Promise.all([
      fetch('/api/resources/categories').then((response) => response.json()),
      fetch(`/api/resources?category=${encodeURIComponent(slug)}&limit=200`).then((response) => response.json()),
      fetch('/api/resources/progress', { cache: 'no-store' }).then((response) => response.json()).catch(() => []),
    ]).then(([categoryData, resourceData, progressData]) => {
      if (!active) return
      setCategories(Array.isArray(categoryData) ? categoryData : [])
      setResources(Array.isArray(resourceData) ? resourceData : [])
      setProgress(Array.isArray(progressData) ? progressData : [])
      setLoading(false)
    }).catch(() => setLoading(false))

    return () => { active = false }
  }, [slug])

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
  const progressByResourceId = useMemo(() => new Map(progress.map((item) => [getProgressResourceId(item), item])), [progress])

  const filteredResources = useMemo(() => {
    const value = query.trim().toLowerCase()
    return resources.filter((resource) => {
      if (activeType && resource.type !== activeType) return false
      if (!value) return true
      return [
        resource.title,
        resource.description,
        resource.url,
        resource.channelTitle,
        resource.categoryId?.name,
        resource.categoryId?.slug,
        ...(resource.tags || []),
        ...(resource.topicTags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(value)
    })
  }, [resources, activeType, query])

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
        <Link href="/resources" className="inline-flex items-center gap-2 text-sm font-bold text-theme-secondary hover:text-theme-primary">
          <i className="fas fa-arrow-left" />
          Resources
        </Link>

        <section className="bg-theme-surface border border-theme-border rounded-2xl p-5 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="min-w-0">
              <div className="w-12 h-12 rounded-xl bg-theme-bg flex items-center justify-center mb-4" style={{ color: category?.color || 'var(--color-accent)' }}>
                <i className={`fas ${category?.icon || 'fa-book-open'}`} />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{category?.name || 'Resources'}</h1>
              <p className="text-theme-secondary mt-2 max-w-2xl">{category?.description || 'Browse curated learning materials in this category.'}</p>
            </div>
            <div className="relative w-full lg:w-[360px]">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-theme-secondary" />
              <input
                className="input-field pl-11"
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

        {loading ? <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="skeleton h-56 rounded-2xl" />)}</section> : null}

        {!loading && continueItems.length > 0 ? (
          <>
            <SectionTitle title="Continue Learning" subtitle="Your recent progress in this category." />
            <ResourceGrid resources={continueItems} allResources={resources} progressByResourceId={progressByResourceId} onOpen={setSelectedResource} />
          </>
        ) : null}

        {!loading ? (
          <>
            <SectionTitle title={activeType ? tabs.find((tab) => tab.id === activeType)?.label : 'All Resources'} subtitle={`${filteredResources.length} item(s) available`} />
            <ResourceGrid resources={filteredResources} allResources={resources} progressByResourceId={progressByResourceId} onOpen={setSelectedResource} />
            {filteredResources.length === 0 ? (
              <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 text-center text-theme-secondary">
                No resources found here yet.
              </div>
            ) : null}
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
  const serialMap = buildVideoSerialMap(allResources || resources)

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

function SectionTitle({ title, subtitle }) {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-extrabold">{title}</h2>
      <p className="text-sm text-theme-secondary mt-1">{subtitle}</p>
    </div>
  )
}

function getProgressResourceId(item) {
  return typeof item.resourceId === 'object' ? item.resourceId?._id : item.resourceId
}

function buildVideoSerialMap(resources) {
  const map = new Map()
  resources
    .filter((resource) => resource.type === 'youtube')
    .sort((a, b) => (a.order || 0) - (b.order || 0) || new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    .forEach((resource, index) => {
      map.set(resource._id, index + 1)
    })
  return map
}
