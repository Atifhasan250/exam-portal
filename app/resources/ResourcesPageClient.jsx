'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import ResourceCard from '@/components/resources/ResourceCard'
import ResourceViewer from '@/components/resources/ResourceViewer'

const RESOURCE_PAGE_SIZE = 80

export default function ResourcesPageClient({
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
      // Progress is a nice-to-have surface; keep the page usable if refresh fails.
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
  }, [])

  const fetchResources = useCallback(async ({ offset = 0, append = false } = {}) => {
    const params = new URLSearchParams({
      limit: String(RESOURCE_PAGE_SIZE),
      offset: String(offset),
    })
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
  }, [query])

  useEffect(() => {
    if (!skippedInitialResourcesFetch.current) {
      skippedInitialResourcesFetch.current = true
      if (initialDataReady && !query.trim()) return
    }

    fetchResources({ offset: 0 })
  }, [fetchResources, initialDataReady, query])

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

  const progressByResourceId = useMemo(() => (
    new Map(progress.map((item) => [getProgressResourceId(item), item]))
  ), [progress])

  const isSearching = query.trim().length > 0

  const continueItems = progress
    .filter((item) => item.resourceId?.type === 'youtube' && !item.completed && item.progressSeconds > 0)
    .sort((a, b) => new Date(b.lastAccessedAt || b.updatedAt || 0) - new Date(a.lastAccessedAt || a.updatedAt || 0))
    .slice(0, 3)
    .map((item) => ({ ...item.resourceId, progressItem: item }))

  const featuredResources = resources.filter((resource) => resource.featured).slice(0, 6)

  const onProgressSaved = (nextProgress) => {
    setProgress((current) => {
      const id = getProgressResourceId(nextProgress)
      const others = current.filter((item) => getProgressResourceId(item) !== id)
      return [nextProgress, ...others]
    })
  }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme page-enter">
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12 pb-28 space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Resources</h1>
            </div>
            <div className="relative w-[46vw] min-w-[150px] max-w-[210px] sm:w-[320px] sm:max-w-none lg:w-[420px]">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-theme-secondary" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="input-field pl-11 text-sm sm:text-base"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="Search web dev, cyber security, PDF notes..."
              />
            </div>
          </div>
        </section>

        {loading || loadingResources ? <LoadingGrid /> : null}

        {!loading && !loadingResources && isSearching ? (
          <>
            <SectionTitle title="Search Results" subtitle={`${resources.length} matching resource(s)`} />
            <ResourceGrid resources={resources} allResources={resources} progressByResourceId={progressByResourceId} onOpen={setSelectedResource} />
            {resources.length === 0 ? <EmptyState text="No resources matched your search." /> : null}
            {hasMoreResources ? <LoadMoreButton loading={loadingMoreResources} onClick={() => fetchResources({ offset: resources.length, append: true })} /> : null}
          </>
        ) : null}

        {!loading && !loadingResources && !isSearching ? (
          <>
            <SectionTitle title="Categories" subtitle="Choose a topic and follow the resources in a clean order." />
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <Link key={category._id} href={`/resources/${category.slug}`} className="bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-sm hover:border-theme-accent/40 transition-all">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-theme-bg flex items-center justify-center shrink-0" style={{ color: category.color || 'var(--color-accent)' }}>
                        <i className={`fas ${category.icon || 'fa-book-open'}`} />
                      </div>
                      <h2 className="text-xl font-extrabold truncate">{category.name}</h2>
                    </div>
                    <span className="text-xs font-bold text-theme-secondary shrink-0">{category.resourceCounts?.total || 0} items</span>
                  </div>
                  {category.description?.trim() ? (
                    <p className="text-sm text-theme-secondary mt-2 line-clamp-2">{category.description.trim()}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 mt-4 text-xs font-bold text-theme-secondary">
                    <span>{category.resourceCounts?.youtube || 0} videos</span>
                    <span>•</span>
                    <span>{category.resourceCounts?.pdf || 0} PDFs</span>
                    <span>•</span>
                    <span>{category.resourceCounts?.link || 0} links</span>
                  </div>
                </Link>
              ))}
              {categories.length === 0 ? <EmptyState text="No resource categories are published yet." /> : null}
            </section>
          </>
        ) : null}

        {!loading && !loadingResources && !isSearching && continueItems.length > 0 ? (
          <SectionTitle title="Continue Watching" subtitle="Pick up from where you stopped." />
        ) : null}
        {!loading && !loadingResources && !isSearching && continueItems.length > 0 ? (
          <ResourceGrid resources={continueItems} allResources={resources} progressByResourceId={progressByResourceId} onOpen={setSelectedResource} />
        ) : null}

        {!loading && !loadingResources && !isSearching && featuredResources.length > 0 ? (
          <>
            <SectionTitle title="Start Here" subtitle="Featured resources for a smoother first step." />
            <ResourceGrid resources={featuredResources} allResources={resources} progressByResourceId={progressByResourceId} onOpen={setSelectedResource} />
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
  const serialMap = buildCategoryVideoSerialMap(allResources || resources)

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
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold">{title}</h2>
        <p className="text-sm text-theme-secondary mt-1">{subtitle}</p>
      </div>
    </div>
  )
}

function LoadingGrid() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((item) => <div key={item} className="skeleton h-56 rounded-2xl" />)}
    </section>
  )
}

function EmptyState({ text }) {
  return (
    <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 text-center text-theme-secondary">
      <i className="fas fa-folder-open text-3xl mb-3 opacity-60" />
      <p className="font-medium">{text}</p>
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

function buildCategoryVideoSerialMap(resources) {
  const groups = new Map()
  const serialMap = new Map()

  resources
    .filter((resource) => resource.type === 'youtube')
    .forEach((resource) => {
      const categoryId = typeof resource.categoryId === 'object' ? resource.categoryId?._id : resource.categoryId
      if (!groups.has(categoryId)) groups.set(categoryId, [])
      groups.get(categoryId).push(resource)
    })

  for (const group of groups.values()) {
    group
      .sort((a, b) => (a.order || 0) - (b.order || 0) || new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
      .forEach((resource, index) => {
        serialMap.set(resource._id, index + 1)
      })
  }

  return serialMap
}
