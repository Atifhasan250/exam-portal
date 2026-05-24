import { getResourceThumbnailUrl, normalizeTags, slugify } from './resourceUtils'

export function normalizeResourcePayload(data) {
  const payload = {
    ...data,
    slug: data.slug || buildResourceSlug(data),
    tags: normalizeTags(data.tags),
    topicTags: normalizeTags(data.topicTags),
  }

  if (!payload.sourcePublishedAt) delete payload.sourcePublishedAt
  if (!payload.assetId) delete payload.assetId
  if (!payload.youtubeId) delete payload.youtubeId
  if (!payload.thumbnailUrl) {
    const thumbnailUrl = getResourceThumbnailUrl(payload)
    if (thumbnailUrl && thumbnailUrl.length <= 1200) payload.thumbnailUrl = thumbnailUrl
  }

  return payload
}

export function buildResourceSlug(data) {
  const base = slugify(data.title || 'resource')
  const suffix = data.youtubeId || data.imagekitFileId || ''

  if (suffix) return `${base}-${slugify(suffix)}`.slice(0, 280)
  return base
}
