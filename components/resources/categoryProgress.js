export function calculateCategoryResourceProgress(category, progressItems = []) {
  const totalItems = Number(category?.resourceCounts?.total || 0)
  if (!category || totalItems <= 0) {
    return {
      percent: 0,
      completedItems: 0,
      startedItems: 0,
      totalItems: 0,
    }
  }

  let progressUnits = 0
  let completedItems = 0
  let startedItems = 0
  const seenResourceIds = new Set()

  progressItems.forEach((item) => {
    const resource = item?.resourceId
    if (!resource || typeof resource !== 'object') return
    if (!resourceBelongsToCategory(resource, category)) return

    const resourceId = resource._id || item.resourceId
    if (!resourceId) return
    const resourceKey = String(resourceId)
    if (seenResourceIds.has(resourceKey)) return

    const unitProgress = getResourceProgressUnit(resource, item)
    if (unitProgress <= 0) return
    seenResourceIds.add(resourceKey)

    progressUnits += unitProgress
    startedItems += 1
    if (item.completed) completedItems += 1
  })

  return {
    percent: Math.min(100, Math.round((progressUnits / totalItems) * 100)),
    completedItems,
    startedItems,
    totalItems,
  }
}

export function CategoryProgressBar({ summary }) {
  if (!summary?.totalItems) return null

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-end gap-3 text-xs font-bold">
        <span className="text-theme-primary">{summary.percent}%</span>
      </div>
      <div className="h-2 bg-theme-bg rounded-full overflow-hidden">
        <div className="h-full bg-theme-accent rounded-full" style={{ width: `${summary.percent}%` }} />
      </div>
      <p className="text-xs font-medium text-theme-secondary">
        {summary.completedItems}/{summary.totalItems} completed
      </p>
    </div>
  )
}

function getResourceProgressUnit(resource, item) {
  if (item.completed) return 1
  if (resource.type !== 'youtube') return 0

  const durationSeconds = Number(resource.durationSeconds || 0)
  if (durationSeconds <= 0) return 0

  const progressSeconds = Number(item.progressSeconds || 0)
  return Math.min(1, Math.max(0, progressSeconds / durationSeconds))
}

function resourceBelongsToCategory(resource, category) {
  const resourceCategory = resource.categoryId
  const resourceCategoryId = typeof resourceCategory === 'object' ? resourceCategory?._id : resourceCategory
  const resourceCategorySlug = typeof resourceCategory === 'object' ? resourceCategory?.slug : ''

  return (
    (category._id && resourceCategoryId && String(category._id) === String(resourceCategoryId)) ||
    (category.slug && resourceCategorySlug && category.slug === resourceCategorySlug)
  )
}
