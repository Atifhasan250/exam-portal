'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import PageLoadingOverlay from '@/components/PageLoadingOverlay'
import ResourceCard from '@/components/resources/ResourceCard'
import { calculateCategoryResourceProgress, CategoryProgressBar } from '@/components/resources/categoryProgress'

const RESOURCE_PAGE_SIZE = 100

export default function ResourcesPageClient({
  initialCategories = [],
  initialResources = [],
  initialHasMoreResources = false,
  initialDataReady = false,
}) {
  const skippedInitialResourcesFetch = useRef(false)
  const resourcesSectionRef = useRef(null)
  const progressRefreshAtRef = useRef(0)
  const progressRefreshPromiseRef = useRef(null)
  const [categories, setCategories] = useState(initialCategories)
  const [resources, setResources] = useState(initialResources)
  const [progress, setProgress] = useState([])
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const [loading, setLoading] = useState(true)
  const [loadingResources, setLoadingResources] = useState(!initialDataReady)
  const [loadingMoreResources, setLoadingMoreResources] = useState(false)
  const [hasMoreResources, setHasMoreResources] = useState(initialHasMoreResources)
  const [resourceOffset, setResourceOffset] = useState(0)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [refreshingResources, setRefreshingResources] = useState(false)

  const refreshProgress = useCallback(async () => {
    const now = Date.now()
    if (now - progressRefreshAtRef.current < 15000) return progressRefreshPromiseRef.current
    if (progressRefreshPromiseRef.current) return progressRefreshPromiseRef.current

    progressRefreshPromiseRef.current = fetch('/api/resources/progress', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProgress(data)
          progressRefreshAtRef.current = Date.now()
        }
      })
      .catch(() => {
        // Progress is a nice-to-have surface; keep the page usable if refresh fails.
      })
      .finally(() => {
        progressRefreshPromiseRef.current = null
      })

    return progressRefreshPromiseRef.current
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
      if (Array.isArray(progressData)) {
        setProgress(progressData)
        progressRefreshAtRef.current = Date.now()
      }
      setLoading(false)
    }).catch(() => setLoading(false))

    return () => { active = false }
  }, [])

  const scrollToResourcesSection = () => {
    window.requestAnimationFrame(() => {
      resourcesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const fetchResources = useCallback(async ({ offset = 0, pageChange = false } = {}) => {
    const nextOffset = Math.max(0, offset)
    const params = new URLSearchParams({
      limit: String(RESOURCE_PAGE_SIZE),
      offset: String(nextOffset),
    })
    const value = debouncedQuery.trim()
    if (!pageChange && value && value.length < 2) {
      setResources([])
      setHasMoreResources(false)
      setResourceOffset(0)
      setRefreshingResources(false)
      setLoadingResources(false)
      return
    }
    if (value) params.set('q', value)

    const refreshInPlace = !pageChange && initialLoadComplete
    if (pageChange) {
      setLoadingMoreResources(true)
    } else if (refreshInPlace) {
      setRefreshingResources(true)
    } else {
      setLoadingResources(true)
    }
    try {
      const response = await fetch(`/api/resources?${params.toString()}`)
      const data = await response.json()
      const items = Array.isArray(data) ? data : []
      setResources(items)
      setResourceOffset(nextOffset)
      setHasMoreResources(response.headers.get('X-Has-More') === 'true')
      if (pageChange) scrollToResourcesSection()
    } catch {
      if (!pageChange) {
        setResources([])
        setResourceOffset(0)
      }
      setHasMoreResources(false)
    } finally {
      if (pageChange) {
        setLoadingMoreResources(false)
      } else if (refreshInPlace) {
        setRefreshingResources(false)
      } else {
        setLoadingResources(false)
      }
    }
  }, [debouncedQuery, initialLoadComplete])

  const loadNextResources = () => {
    fetchResources({ offset: resourceOffset + resources.length, pageChange: true })
  }

  const loadPreviousResources = () => {
    fetchResources({ offset: resourceOffset - RESOURCE_PAGE_SIZE, pageChange: true })
  }

  useEffect(() => {
    if (!skippedInitialResourcesFetch.current) {
      skippedInitialResourcesFetch.current = true
      if (initialDataReady && !debouncedQuery.trim()) return
    }

    fetchResources({ offset: 0 })
  }, [debouncedQuery, fetchResources, initialDataReady])

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

  useEffect(() => {
    if (!loading && !loadingResources) setInitialLoadComplete(true)
  }, [loading, loadingResources])

  const progressByResourceId = useMemo(() => (
    new Map(progress.map((item) => [getProgressResourceId(item), item]))
  ), [progress])

  const isSearching = query.trim().length > 0
  const matchedCategories = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return []
    return categories.filter((category) => (
      category.name?.toLowerCase().includes(value) ||
      category.slug?.toLowerCase().includes(value) ||
      category.description?.toLowerCase().includes(value)
    ))
  }, [categories, query])

  const continueItems = progress
    .filter((item) => item.resourceId?.type === 'youtube' && !item.completed && item.progressSeconds > 0)
    .sort((a, b) => new Date(b.lastAccessedAt || b.updatedAt || 0) - new Date(a.lastAccessedAt || a.updatedAt || 0))
    .slice(0, 3)
    .map((item) => ({ ...item.resourceId, progressItem: item }))

  const featuredResources = resources.filter((resource) => resource.featured).slice(0, 6)
  const initialBlockingLoading = !initialLoadComplete && (loading || loadingResources)

  if (initialBlockingLoading) return (
    <PageLoadingOverlay>
      <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme">
        <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12 pb-28 space-y-8">
          <section className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="skeleton h-10 w-44 rounded-xl" />
              <div className="skeleton h-12 w-full sm:w-[320px] lg:w-[420px] rounded-xl" />
            </div>
          </section>

          <LoadingGrid />
        </main>
      </div>
    </PageLoadingOverlay>
  )

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme page-enter">
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12 pb-28 space-y-8">
        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Resources</h1>
                {refreshingResources ? <i className="fas fa-circle-notch fa-spin text-theme-secondary text-sm" aria-label="Refreshing resources" /> : null}
              </div>
            </div>
            <div className="relative w-full sm:w-[320px] sm:flex-none lg:w-[420px]">
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
            {matchedCategories.length > 0 ? (
              <>
                <SectionTitle title="Matching Categories" subtitle={`${matchedCategories.length} matching categor${matchedCategories.length === 1 ? 'y' : 'ies'}`} />
                <CategoryGrid categories={matchedCategories} progress={progress} />
              </>
            ) : null}
            <div ref={resourcesSectionRef}>
            <SectionTitle title="Search Results" subtitle={`${resources.length} matching resource(s)`} />
            </div>
            {resources.length > 0 ? <ResourceGrid resources={resources} allResources={resources} progressByResourceId={progressByResourceId} /> : null}
            {resources.length === 0 && matchedCategories.length === 0 ? <EmptyState text="No resources matched your search." /> : null}
            {hasMoreResources || resourceOffset > 0 ? (
              <ResourcePageControls
                loading={loadingMoreResources}
                hasNext={hasMoreResources}
                hasPrevious={resourceOffset > 0}
                onNext={loadNextResources}
                onPrevious={loadPreviousResources}
              />
            ) : null}
          </>
        ) : null}

        {!loading && !loadingResources && !isSearching && continueItems.length > 0 ? (
          <SectionTitle title="Continue Watching" subtitle="Pick up from where you stopped." />
        ) : null}
        {!loading && !loadingResources && !isSearching && continueItems.length > 0 ? (
          <ResourceGrid resources={continueItems} allResources={resources} progressByResourceId={progressByResourceId} metaMode="category" />
        ) : null}

        {!loading && !loadingResources && !isSearching ? (
          <>
            <SectionTitle title="Categories" subtitle="Choose a topic and follow the resources in a clean order." />
            <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <Link key={category._id} href={`/resources/${category.slug}`} className="min-w-0 w-full bg-theme-surface border border-theme-border rounded-2xl p-4 sm:p-5 shadow-sm hover:border-theme-accent/40 transition-all">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-theme-progress-track flex items-center justify-center shrink-0" style={{ color: category.color || 'var(--color-accent)' }}>
                        <i className={`fas ${category.icon || 'fa-book-open'}`} />
                      </div>
                      <h2 className="min-w-0 text-lg sm:text-xl font-extrabold leading-snug break-words">{category.name}</h2>
                    </div>
                    <span className="self-start rounded-lg bg-theme-progress-track px-2.5 py-1 text-xs font-bold text-theme-secondary shrink-0">{category.resourceCounts?.total || 0} items</span>
                  </div>
                  {category.description?.trim() ? (
                    <p className="text-sm text-theme-secondary mt-3 line-clamp-2 break-words">{category.description.trim()}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 mt-4 text-xs font-bold text-theme-secondary">
                    <span>{category.resourceCounts?.youtube || 0} videos</span>
                    <span>&bull;</span>
                    <span>{category.resourceCounts?.pdf || 0} PDFs</span>
                    <span>&bull;</span>
                    <span>{category.resourceCounts?.link || 0} links</span>
                  </div>
                  <CategoryProgressBar summary={calculateCategoryResourceProgress(category, progress)} />
                </Link>
              ))}
              {categories.length === 0 ? <EmptyState text="No resource categories are published yet." /> : null}
            </section>
          </>
        ) : null}

        {!loading && !loadingResources && !isSearching && featuredResources.length > 0 ? (
          <>
            <SectionTitle title="Start Here" subtitle="Featured resources for a smoother first step." />
            <ResourceGrid resources={featuredResources} allResources={resources} progressByResourceId={progressByResourceId} />
          </>
        ) : null}
      </main>
    </div>
  )
}

function CategoryGrid({ categories, progress }) {
  return (
    <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <Link key={category._id} href={`/resources/${category.slug}`} className="min-w-0 w-full bg-theme-surface border border-theme-border rounded-2xl p-4 sm:p-5 shadow-sm hover:border-theme-accent/40 transition-all">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-theme-progress-track flex items-center justify-center shrink-0" style={{ color: category.color || 'var(--color-accent)' }}>
                <i className={`fas ${category.icon || 'fa-book-open'}`} />
              </div>
              <h2 className="min-w-0 text-lg sm:text-xl font-extrabold leading-snug break-words">{category.name}</h2>
            </div>
            <span className="self-start rounded-lg bg-theme-progress-track px-2.5 py-1 text-xs font-bold text-theme-secondary shrink-0">{category.resourceCounts?.total || 0} items</span>
          </div>
          {category.description?.trim() ? (
            <p className="text-sm text-theme-secondary mt-3 line-clamp-2 break-words">{category.description.trim()}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 mt-4 text-xs font-bold text-theme-secondary">
            <span>{category.resourceCounts?.youtube || 0} videos</span>
            <span>&bull;</span>
            <span>{category.resourceCounts?.pdf || 0} PDFs</span>
            <span>&bull;</span>
            <span>{category.resourceCounts?.link || 0} links</span>
          </div>
          <CategoryProgressBar summary={calculateCategoryResourceProgress(category, progress)} />
        </Link>
      ))}
    </section>
  )
}

function ResourceGrid({ resources, allResources, progressByResourceId, metaMode = 'default' }) {
  const serialMap = buildCategoryResourceSerialMap(allResources || resources)

  return (
    <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {resources.map((resource) => (
        <ResourceCard
          key={resource._id}
          resource={resource}
          progress={resource.progressItem || progressByResourceId.get(resource._id)}
          serialNumber={serialMap.get(resource._id)}
          metaMode={metaMode}
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

function ResourcePageControls({ loading, hasNext, hasPrevious, onNext, onPrevious }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {hasNext ? (
        <button
          onClick={onNext}
          disabled={loading}
          className="px-5 py-3 rounded-xl bg-theme-surface border border-theme-border text-sm font-bold text-theme-secondary hover:text-theme-primary disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Load Next Resources'}
        </button>
      ) : null}
      {hasPrevious ? (
        <button
          onClick={onPrevious}
          disabled={loading}
          className="px-5 py-3 rounded-xl bg-theme-surface border border-theme-border text-sm font-bold text-theme-secondary hover:text-theme-primary disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Load Prev Resources'}
        </button>
      ) : null}
    </div>
  )
}

function getProgressResourceId(item) {
  return typeof item.resourceId === 'object' ? item.resourceId?._id : item.resourceId
}

function useDebouncedValue(value, delayMs) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delayMs)
    return () => clearTimeout(timeoutId)
  }, [delayMs, value])

  return debouncedValue
}

function buildCategoryResourceSerialMap(resources) {
  const groups = new Map()
  const serialMap = new Map()

  resources
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
