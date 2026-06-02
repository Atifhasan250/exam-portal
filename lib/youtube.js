import { extractYouTubePlaylistId, extractYouTubeVideoId, parseIsoDurationToSeconds, pickBestThumbnail } from './resourceUtils'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'
const MAX_PLAYLIST_PREVIEW_ITEMS = 100
const MAX_PLAYLIST_PAGE_ITEMS = 50
const YOUTUBE_FETCH_TIMEOUT_MS = 8000

function abortAfter(controller, ms, message) {
  return setTimeout(() => controller.abort(new Error(message)), ms)
}

function requireYouTubeApiKey() {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error('Missing environment variable: YOUTUBE_API_KEY')
  }
  return process.env.YOUTUBE_API_KEY
}

async function youtubeFetch(path, params) {
  const apiKey = requireYouTubeApiKey()
  const url = new URL(`${YOUTUBE_API_BASE}/${path}`)
  for (const [key, value] of Object.entries({ ...params, key: apiKey })) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value)
  }

  const controller = new AbortController()
  const timeoutId = abortAfter(controller, YOUTUBE_FETCH_TIMEOUT_MS, 'YouTube API request timed out')
  let response
  let data
  try {
    response = await fetch(url, { next: { revalidate: 0 }, signal: controller.signal })
    data = await response.json().catch(() => ({}))
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(controller.signal.reason?.message || 'YouTube API request timed out', { cause: error })
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    const message = data?.error?.message || 'YouTube API request failed'
    throw new Error(message)
  }

  return data
}

export async function fetchYouTubeVideos(inputIds) {
  const ids = [...new Set(inputIds.map((id) => extractYouTubeVideoId(id) || id).filter(Boolean))]
  if (!ids.length) return []

  const batches = []
  for (let index = 0; index < ids.length; index += 50) batches.push(ids.slice(index, index + 50))

  const videos = []
  for (const batch of batches) {
    const data = await youtubeFetch('videos', {
      part: 'snippet,contentDetails,status',
      id: batch.join(','),
      maxResults: 50,
    })

    videos.push(...(data.items || []).map(normalizeVideo))
  }

  return videos
}

export async function previewYouTubeVideo(urlOrId) {
  const videoId = extractYouTubeVideoId(urlOrId)
  if (!videoId) throw new Error('Invalid YouTube video URL or ID')

  const [video] = await fetchYouTubeVideos([videoId])
  if (!video) throw new Error('YouTube video was not found or is unavailable')

  return {
    ...video,
    transcriptText: '',
    transcriptLanguage: '',
    transcriptFetchError: '',
  }
}

export async function previewYouTubePlaylist(urlOrId, limit = MAX_PLAYLIST_PREVIEW_ITEMS) {
  const playlistId = extractYouTubePlaylistId(urlOrId)
  if (!playlistId) throw new Error('Invalid YouTube playlist URL or ID')

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), MAX_PLAYLIST_PREVIEW_ITEMS)
  const playlistItems = []
  let pageToken = ''

  while (playlistItems.length < safeLimit) {
    const data = await youtubeFetch('playlistItems', {
      part: 'snippet,status',
      playlistId,
      maxResults: Math.min(50, safeLimit - playlistItems.length),
      pageToken,
    })

    const items = (data.items || [])
      .map((item) => ({
        position: item.snippet?.position ?? playlistItems.length,
        videoId: item.snippet?.resourceId?.videoId || '',
      }))
      .filter((item) => item.videoId)

    playlistItems.push(...items)
    pageToken = data.nextPageToken
    if (!pageToken) break
  }

  const details = await fetchYouTubeVideos(playlistItems.map((item) => item.videoId))
  const detailsById = new Map(details.map((video) => [video.youtubeId, video]))

  return playlistItems
    .map((item, index) => ({
      ...detailsById.get(item.videoId),
      youtubePlaylistId: playlistId,
      playlistPosition: item.position ?? index,
    }))
    .filter((item) => item.youtubeId)
}

export async function fetchYouTubePlaylistPage(urlOrId, { pageToken = '', limit = MAX_PLAYLIST_PAGE_ITEMS } = {}) {
  const playlistId = extractYouTubePlaylistId(urlOrId)
  if (!playlistId) throw new Error('Invalid YouTube playlist URL or ID')

  const safeLimit = Math.min(Math.max(Number(limit) || MAX_PLAYLIST_PAGE_ITEMS, 1), MAX_PLAYLIST_PAGE_ITEMS)
  const data = await youtubeFetch('playlistItems', {
    part: 'snippet,status',
    playlistId,
    maxResults: safeLimit,
    pageToken,
  })

  const playlistItems = (data.items || [])
    .map((item) => ({
      position: item.snippet?.position ?? 0,
      videoId: item.snippet?.resourceId?.videoId || '',
    }))
    .filter((item) => item.videoId)

  const details = await fetchYouTubeVideos(playlistItems.map((item) => item.videoId))
  const detailsById = new Map(details.map((video) => [video.youtubeId, video]))
  const videos = playlistItems
    .map((item, index) => ({
      ...detailsById.get(item.videoId),
      youtubePlaylistId: playlistId,
      playlistPosition: item.position ?? index,
    }))
    .filter((item) => item.youtubeId)

  return {
    playlistId,
    totalCount: data.pageInfo?.totalResults || videos.length,
    nextPageToken: data.nextPageToken || '',
    videos,
  }
}

function normalizeVideo(video) {
  const snippet = video.snippet || {}
  const contentDetails = video.contentDetails || {}
  const status = video.status || {}
  const url = `https://www.youtube.com/watch?v=${video.id}`

  return {
    youtubeId: video.id,
    type: 'youtube',
    title: snippet.title || 'Untitled video',
    description: snippet.description || '',
    url,
    thumbnailUrl: pickBestThumbnail(snippet.thumbnails),
    channelTitle: snippet.channelTitle || '',
    durationSeconds: parseIsoDurationToSeconds(contentDetails.duration),
    sourcePublishedAt: snippet.publishedAt || null,
    publishedPrivacyStatus: status.privacyStatus || '',
    metadataSource: 'youtube',
    metadataFetchedAt: new Date().toISOString(),
  }
}
