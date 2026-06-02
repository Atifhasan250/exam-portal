import mongoose from 'mongoose'

export const RESOURCE_TYPES = ['youtube', 'pdf', 'link', 'image', 'file']
export const RESOURCE_LEVELS = ['beginner', 'intermediate', 'advanced']
export const RESOURCE_LANGUAGES = ['bn', 'en', 'hi', 'mixed', 'other']

export function serialize(value) {
  return JSON.parse(JSON.stringify(value))
}

export function isObjectId(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-fA-F]{24}$/.test(value) &&
    mongoose.Types.ObjectId.isValid(value)
  )
}

export function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function normalizeSearchQuery(value, maxLength = 80) {
  return String(value || '').trim().slice(0, maxLength)
}

export function toPublicResource(resource) {
  if (!resource) return null
  const category = resource.categoryId
  const hasPopulatedCategory = category && typeof category === 'object' && (
    'name' in category ||
    'slug' in category ||
    'icon' in category ||
    'color' in category
  )

  return {
    _id: resource._id,
    categoryId: hasPopulatedCategory
      ? {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          color: category.color,
        }
      : null,
    type: resource.type,
    title: resource.title,
    slug: resource.slug,
    description: resource.description,
    url: resource.url,
    thumbnailUrl: getResourceThumbnailUrl(resource),
    imagekitUrl: resource.imagekitUrl,
    fileName: resource.fileName,
    mimeType: resource.mimeType,
    size: resource.size,
    youtubeId: resource.youtubeId,
    channelTitle: resource.channelTitle,
    durationSeconds: resource.durationSeconds,
    level: resource.level,
    language: resource.language,
    tags: resource.tags || [],
    topicTags: resource.topicTags || [],
    quizQuestionCount: Array.isArray(resource.quizQuestions) ? resource.quizQuestions.length : 0,
    order: resource.order,
    featured: resource.featured,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  }
}

export function getResourceThumbnailUrl(resource) {
  if (resource?.thumbnailUrl) return resource.thumbnailUrl

  if (resource?.type === 'pdf') {
    return buildImageKitPdfThumbnailUrl(resource.imagekitUrl)
  }

  if (resource?.type === 'image' && resource?.imagekitUrl) {
    return resource.imagekitUrl
  }

  return ''
}

export function buildImageKitPdfThumbnailUrl(value) {
  if (!value) return ''

  try {
    const url = new URL(value)
    if (!/(^|\.)imagekit\.io$/i.test(url.hostname)) return ''

    url.hash = ''
    url.search = ''
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/ik-thumbnail.jpg`
    url.searchParams.set('tr', 'w-640,h-360,c-at_max,f-webp,q-80')
    return url.toString()
  } catch {
    return ''
  }
}

export function toPublicResources(resources) {
  return resources.map(toPublicResource).filter(Boolean)
}

export function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140)
}

export function publicResourceSlug(resource) {
  const base = slugify(resource?.title || 'resource')
  const suffix = resource?.slug || resource?._id || ''

  if (resource?.slug) return resource.slug
  return `${base}-${slugify(suffix)}`.slice(0, 280)
}

export function normalizeTags(tags = [], limit = 20) {
  const seen = new Set()

  return tags
    .map((tag) => String(tag || '').trim().toLowerCase())
    .filter(Boolean)
    .filter((tag) => {
      if (seen.has(tag)) return false
      seen.add(tag)
      return true
    })
    .slice(0, limit)
}

export function extractYouTubeVideoId(input) {
  if (!input) return ''

  const value = String(input).trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value

  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : ''
    }

    if (/(^|\.)youtube\.com$/i.test(host) || /(^|\.)youtube-nocookie\.com$/i.test(host)) {
      const watchId = url.searchParams.get('v')
      if (/^[a-zA-Z0-9_-]{11}$/.test(watchId || '')) return watchId

      const parts = url.pathname.split('/').filter(Boolean)
      const videoIndex = parts.findIndex((part) => ['embed', 'shorts', 'live'].includes(part))
      const id = videoIndex >= 0 ? parts[videoIndex + 1] : ''
      return /^[a-zA-Z0-9_-]{11}$/.test(id || '') ? id : ''
    }
  } catch {
    return ''
  }

  return ''
}

export function extractYouTubePlaylistId(input) {
  if (!input) return ''

  const value = String(input).trim()
  if (/^[a-zA-Z0-9_-]{12,80}$/.test(value) && value.startsWith('PL')) return value

  try {
    const url = new URL(value)
    const listId = url.searchParams.get('list')
    return /^[a-zA-Z0-9_-]{12,80}$/.test(listId || '') ? listId : ''
  } catch {
    return ''
  }
}

export function parseIsoDurationToSeconds(duration) {
  const match = String(duration || '').match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  )
  if (!match) return 0

  const [, days = 0, hours = 0, minutes = 0, seconds = 0] = match.map((part) => Number(part || 0))
  return days * 86400 + hours * 3600 + minutes * 60 + seconds
}

export function pickBestThumbnail(thumbnails = {}) {
  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    ''
  )
}

export function formatDuration(seconds = 0) {
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return safeSeconds ? `${safeSeconds}s` : ''
}
