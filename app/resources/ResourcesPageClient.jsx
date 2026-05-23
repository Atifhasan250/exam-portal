'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ResourceCard from '@/components/resources/ResourceCard'
import ResourceViewer from '@/components/resources/ResourceViewer'

export default function ResourcesPageClient() {
  const [categories, setCategories] = useState([])
  const [resources, setResources] = useState([])
  const [latestResources, setLatestResources] = useState([])
  const [progress, setProgress] = useState([])
  const [selectedResource, setSelectedResource] = useState(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

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
    Promise.all([
      fetch('/api/resources/categories').then((response) => response.json()),
      fetch('/api/resources?limit=80').then((response) => response.json()),
      fetch('/api/resources?sort=latest&limit=5').then((response) => response.json()),
      fetch('/api/resources/progress', { cache: 'no-store' }).then((response) => response.json()).catch(() => []),
    ]).then(([categoryData, resourceData, latestData, progressData]) => {
      if (!active) return
      setCategories(Array.isArray(categoryData) ? categoryData : [])
      setResources(Array.isArray(resourceData) ? resourceData : [])
      setLatestResources(Array.isArray(latestData) ? latestData : [])
      setProgress(Array.isArray(progressData) ? progressData : [])
      setLoading(false)
    }).catch(() => setLoading(false))

    return () => { active = false }
  }, [])

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

  const filteredResources = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return resources
    return resources.filter((resource) => (
      [
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
    ))
  }, [resources, query])

  const isSearching = query.trim().length > 0

  const continueItems = progress
    .filter((item) => item.resourceId?.type === 'youtube' && !item.completed && item.progressSeconds > 0)
    .sort((a, b) => new Date(b.lastAccessedAt || b.updatedAt || 0) - new Date(a.lastAccessedAt || a.updatedAt || 0))
    .slice(0, 3)
    .map((item) => ({ ...item.resourceId, progressItem: item }))

  const featuredResources = filteredResources.filter((resource) => resource.featured).slice(0, 6)
  const visibleLatestResources = query
    ? latestResources.filter((resource) => filteredResources.some((item) => item._id === resource._id))
    : latestResources

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
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Resources</h1>
              <p className="text-theme-secondary mt-2 max-w-2xl">
                Find beginner-friendly videos, notes, and useful links organized for IT students.
              </p>
            </div>
            <div className="relative w-full lg:w-[420px]">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-theme-secondary" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="input-field pl-11"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="Search web dev, cyber security, PDF notes..."
              />
            </div>
          </div>
        </section>

        {loading ? <LoadingGrid /> : null}

        {!loading && isSearching ? (
          <>
            <SectionTitle title="Search Results" subtitle={`${filteredResources.length} matching resource(s)`} />
            <ResourceGrid resources={filteredResources} allResources={resources} progressByResourceId={progressByResourceId} onOpen={setSelectedResource} />
            {filteredResources.length === 0 ? <EmptyState text="No resources matched your search." /> : null}
          </>
        ) : null}

        {!loading && !isSearching && continueItems.length > 0 ? (
          <SectionTitle title="Continue Learning" subtitle="Pick up from where you stopped." />
        ) : null}
        {!loading && !isSearching && continueItems.length > 0 ? (
          <ResourceGrid resources={continueItems} allResources={resources} progressByResourceId={progressByResourceId} onOpen={setSelectedResource} />
        ) : null}

        {!loading && !isSearching ? (
          <>
            <SectionTitle title="Categories" subtitle="Choose a topic and follow the resources in a clean order." />
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <Link key={category._id} href={`/resources/${category.slug}`} className="bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-sm hover:border-theme-accent/40 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="w-12 h-12 rounded-xl bg-theme-bg flex items-center justify-center shrink-0" style={{ color: category.color || 'var(--color-accent)' }}>
                      <i className={`fas ${category.icon || 'fa-book-open'}`} />
                    </div>
                    <span className="text-xs font-bold text-theme-secondary">{category.resourceCounts?.total || 0} items</span>
                  </div>
                  <h2 className="text-xl font-extrabold mt-4">{category.name}</h2>
                  <p className="text-sm text-theme-secondary mt-2 line-clamp-2">{category.description || 'Curated learning resources for this topic.'}</p>
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

        {!loading && !isSearching && featuredResources.length > 0 ? (
          <>
            <SectionTitle title="Start Here" subtitle="Featured resources for a smoother first step." />
            <ResourceGrid resources={featuredResources} allResources={resources} progressByResourceId={progressByResourceId} onOpen={setSelectedResource} />
          </>
        ) : null}

        {!loading && !isSearching ? (
          <>
            <SectionTitle title="Latest Resources" subtitle="Recently added videos, notes, and links." />
            <ResourceGrid resources={visibleLatestResources} allResources={[...resources, ...latestResources]} progressByResourceId={progressByResourceId} onOpen={setSelectedResource} />
            {visibleLatestResources.length === 0 ? <EmptyState text="No resources found for this search." /> : null}
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
