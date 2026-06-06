'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { parseJSON, parseTXT } from '@/utils/parseQuestions'

const emptyCategory = {
  name: '',
  slug: '',
  description: '',
  icon: 'fa-book-open',
  color: '#ea7a53',
  published: true,
  featured: false,
}

const categoryIcons = [
  { value: 'fa-book-open', label: 'Learning' },
  { value: 'fa-code', label: 'Code' },
  { value: 'fa-laptop-code', label: 'Web Dev' },
  { value: 'fa-user-shield', label: 'Security' },
  { value: 'fa-robot', label: 'AI' },
  { value: 'fa-database', label: 'Database' },
  { value: 'fa-network-wired', label: 'Network' },
  { value: 'fa-file-lines', label: 'Notes' },
  { value: 'fa-brain', label: 'Logic' },
  { value: 'fa-graduation-cap', label: 'Exam Prep' },
]

const categoryColors = [
  { value: '#ea7a53', label: 'Accent' },
  { value: '#f09a7d', label: 'Accent soft' },
  { value: '#081126', label: 'Primary' },
  { value: '#24324f', label: 'Primary soft' },
  { value: '#8fd1bd', label: 'Mint' },
  { value: '#62b99f', label: 'Mint deep' },
  { value: '#f6eecf', label: 'Warm surface' },
  { value: '#eadfbd', label: 'Progress track' },
  { value: '#dc2626', label: 'Error' },
  { value: '#047857', label: 'Success' },
]

const emptyResource = {
  categoryId: '',
  type: 'youtube',
  title: '',
  description: '',
  transcriptText: '',
  url: '',
  thumbnailUrl: '',
  youtubeId: '',
  youtubePlaylistId: '',
  channelTitle: '',
  durationSeconds: 0,
  assetId: '',
  imagekitFileId: '',
  imagekitUrl: '',
  fileName: '',
  mimeType: '',
  size: 0,
  level: 'beginner',
  language: 'bn',
  tagsInput: '',
  topicTagsInput: '',
  quizQuestions: [],
  published: false,
  featured: false,
}

const typeLabels = {
  youtube: 'YouTube',
  pdf: 'PDF',
  link: 'Link',
  image: 'Image',
  file: 'File',
}

const ADMIN_RESOURCE_PAGE_SIZE = 100
const PLAYLIST_IMPORT_PAGE_SIZE = 50
const PLAYLIST_IMPORT_REQUEST_SIZE = 100
const PLAYLIST_VISIBLE_BATCH_SIZE = 50
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'application/octet-stream',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
])

function isAllowedUpload(file) {
  const mimeType = file?.type || 'application/octet-stream'
  return mimeType.startsWith('image/') || ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)
}

export default function AdminResourcesPage() {
  const router = useRouter()
  const resourcesPanelRef = useRef(null)
  const [categories, setCategories] = useState([])
  const [resources, setResources] = useState([])
  const [resourceTotal, setResourceTotal] = useState(0)
  const [resourceOffset, setResourceOffset] = useState(0)
  const [hasMoreResources, setHasMoreResources] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMoreResources, setLoadingMoreResources] = useState(false)
  const [activeTab, setActiveTab] = useState('resources')
  const [categoryForm, setCategoryForm] = useState(emptyCategory)
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [resourceForm, setResourceForm] = useState(emptyResource)
  const [editingResourceId, setEditingResourceId] = useState('')
  const [resourceFilter, setResourceFilter] = useState({ categoryId: '', type: '', q: '' })
  const [selectedResourceIds, setSelectedResourceIds] = useState(new Set())
  const [bulkResourceAction, setBulkResourceAction] = useState('')
  const [draggedCategoryId, setDraggedCategoryId] = useState('')
  const [categoryDropPosition, setCategoryDropPosition] = useState(null)
  const [draggedResourceId, setDraggedResourceId] = useState('')
  const [resourceDropPosition, setResourceDropPosition] = useState(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [playlistPreview, setPlaylistPreview] = useState(null)
  const [selectedPlaylistVideos, setSelectedPlaylistVideos] = useState(new Set())
  const [playlistVisibleCount, setPlaylistVisibleCount] = useState(PLAYLIST_VISIBLE_BATCH_SIZE)
  const [playlistImportProgress, setPlaylistImportProgress] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const params = buildResourceListParams(resourceFilter, 0)
      const [categoryResponse, resourceResponse] = await Promise.all([
        fetch('/api/admin/resources/categories'),
        fetch(`/api/admin/resources?${params.toString()}`),
      ])

      if (categoryResponse.status === 401 || resourceResponse.status === 401) {
        router.push('/admin')
        return
      }

      if (!categoryResponse.ok || !resourceResponse.ok) {
        throw new Error('Resource CMS load failed')
      }

      const [categoryData, resourceData] = await Promise.all([
        categoryResponse.json(),
        resourceResponse.json(),
      ])

      const resourceItems = Array.isArray(resourceData) ? resourceData : resourceData.resources || []
      setCategories(Array.isArray(categoryData) ? categoryData : [])
      setResources(resourceItems)
      setResourceOffset(0)
      setResourceTotal(Array.isArray(resourceData) ? resourceItems.length : resourceData.totalCount || resourceItems.length)
      setHasMoreResources(!Array.isArray(resourceData) && Boolean(resourceData.hasMore))
      setResourceForm((current) => ({
        ...current,
        categoryId: current.categoryId || categoryData?.[0]?._id || '',
      }))
    } catch {
      setError('Could not load resources. Check the server logs and try again.')
    }
    setLoading(false)
  }, [resourceFilter, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredResources = resources
  const visibleResourceCategoryIds = new Set(filteredResources.map(getCategoryId).filter(Boolean))
  const inferredReorderCategoryId = !resourceFilter.categoryId
    && !resourceFilter.type
    && !resourceFilter.q.trim()
    && filteredResources.length === resourceTotal
    && visibleResourceCategoryIds.size === 1
    ? [...visibleResourceCategoryIds][0]
    : ''
  const reorderCategoryId = resourceFilter.categoryId || inferredReorderCategoryId
  const canReorderResources = Boolean(reorderCategoryId) && !resourceFilter.type && !resourceFilter.q.trim()
  const visibleResourceIds = filteredResources.map((resource) => resource._id)
  const selectedVisibleResourceCount = visibleResourceIds.filter((id) => selectedResourceIds.has(id)).length
  const allVisibleResourcesSelected = visibleResourceIds.length > 0 && selectedVisibleResourceCount === visibleResourceIds.length

  useEffect(() => {
    setSelectedResourceIds((current) => {
      const visibleIds = new Set(resources.map((resource) => resource._id))
      const next = new Set([...current].filter((id) => visibleIds.has(id)))
      return next.size === current.size ? current : next
    })
  }, [resources])

  const scrollToResourcesPanel = () => {
    window.requestAnimationFrame(() => {
      resourcesPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const loadResourcePage = async (offset) => {
    const nextOffset = Math.max(0, offset)
    setLoadingMoreResources(true)
    setError('')
    try {
      const params = buildResourceListParams(resourceFilter, nextOffset)
      const response = await fetch(`/api/admin/resources?${params.toString()}`)
      if (response.status === 401) {
        router.push('/admin')
        return
      }
      if (!response.ok) throw new Error('Resource CMS load failed')

      const data = await response.json()
      const items = data.resources || []
      setResources(items)
      setResourceOffset(nextOffset)
      setResourceTotal(data.totalCount || resourceTotal)
      setHasMoreResources(Boolean(data.hasMore))
      scrollToResourcesPanel()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingMoreResources(false)
    }
  }

  const loadNextResources = () => {
    loadResourcePage(resourceOffset + resources.length)
  }

  const loadPreviousResources = () => {
    loadResourcePage(resourceOffset - ADMIN_RESOURCE_PAGE_SIZE)
  }

  const resetCategoryForm = () => {
    setCategoryForm(emptyCategory)
    setEditingCategoryId('')
  }

  const resetResourceForm = () => {
    setResourceForm({ ...emptyResource, categoryId: categories[0]?._id || '' })
    setEditingResourceId('')
    setYoutubeUrl('')
  }

  const saveCategory = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const url = editingCategoryId
        ? `/api/admin/resources/categories/${editingCategoryId}`
        : '/api/admin/resources/categories'
      const response = await fetch(url, {
        method: editingCategoryId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...categoryForm,
          slug: categoryForm.slug || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(formatApiError(data, 'Category save failed'))
      setMessage(editingCategoryId ? 'Category updated.' : 'Category created.')
      resetCategoryForm()
      await loadData()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const editCategory = (category) => {
    setActiveTab('categories')
    setEditingCategoryId(category._id)
    setCategoryForm({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      icon: category.icon || 'fa-book-open',
      color: category.color || '#ea7a53',
      published: Boolean(category.published),
      featured: Boolean(category.featured),
    })
  }

  const deleteCategory = async (category) => {
    if (!window.confirm(`Delete category "${category.name}"? It must be empty first.`)) return
    setError('')
    const response = await fetch(`/api/admin/resources/categories/${category._id}`, { method: 'DELETE' })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || 'Category delete failed')
      return
    }
    setMessage('Category deleted.')
    await loadData()
  }

  const saveResource = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const formToSave = await prepareResourceForSave(resourceForm, youtubeUrl, categories)
      const url = editingResourceId
        ? `/api/admin/resources/${editingResourceId}`
        : '/api/admin/resources'
      const body = resourceFormToPayload(formToSave)
      const response = await fetch(url, {
        method: editingResourceId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(formatApiError(data, 'Resource save failed'))
      setMessage(editingResourceId ? 'Resource updated.' : 'Resource created.')
      resetResourceForm()
      await loadData()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const editResource = async (resource) => {
    setError('')
    let fullResource
    try {
      const response = await fetch(`/api/admin/resources/${resource._id}`)
      if (response.status === 401) {
        router.push('/admin')
        return
      }
      const data = await response.json()
      if (!response.ok) throw new Error(formatApiError(data, 'Resource load failed'))
      fullResource = data
    } catch (err) {
      setError(err.message)
      return
    }

    setActiveTab('resources')
    setEditingResourceId(fullResource._id)
    setResourceForm({
      categoryId: getCategoryId(fullResource),
      type: fullResource.type || 'youtube',
      title: fullResource.title || '',
      description: fullResource.description || '',
      transcriptText: '',
      url: fullResource.url || '',
      thumbnailUrl: fullResource.thumbnailUrl || '',
      youtubeId: fullResource.youtubeId || '',
      youtubePlaylistId: fullResource.youtubePlaylistId || '',
      channelTitle: fullResource.channelTitle || '',
      durationSeconds: fullResource.durationSeconds || 0,
      assetId: typeof fullResource.assetId === 'object' ? fullResource.assetId?._id || '' : fullResource.assetId || '',
      imagekitFileId: fullResource.imagekitFileId || '',
      imagekitUrl: fullResource.imagekitUrl || '',
      fileName: fullResource.fileName || '',
      mimeType: fullResource.mimeType || '',
      size: fullResource.size || 0,
      level: fullResource.level || 'beginner',
      language: fullResource.language || 'bn',
      tagsInput: (fullResource.tags || []).join(', '),
      topicTagsInput: (fullResource.topicTags || []).join(', '),
      quizQuestions: normalizeQuizQuestionsForForm(fullResource.quizQuestions),
      published: Boolean(fullResource.published),
      featured: Boolean(fullResource.featured),
    })
  }

  const deleteResource = async (resource) => {
    if (!window.confirm(`Delete resource "${resource.title}"?`)) return
    setError('')
    const response = await fetch(`/api/admin/resources/${resource._id}`, { method: 'DELETE' })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || 'Resource delete failed')
      return
    }
    setMessage('Resource deleted.')
    await loadData()
  }

  const toggleResourceSelection = (resourceId, checked) => {
    setSelectedResourceIds((current) => {
      const next = new Set(current)
      if (checked) next.add(resourceId)
      else next.delete(resourceId)
      return next
    })
  }

  const toggleAllVisibleResources = (checked) => {
    setSelectedResourceIds((current) => {
      const next = new Set(current)
      for (const id of visibleResourceIds) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const deleteSelectedResources = async () => {
    const ids = [...selectedResourceIds]
    if (!ids.length) return
    if (!window.confirm(`Delete ${ids.length} selected resource(s)? This cannot be undone.`)) return

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/resources/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(formatApiError(data, 'Bulk delete failed'))
      setSelectedResourceIds(new Set())
      setBulkResourceAction('')
      if (editingResourceId && ids.includes(editingResourceId)) resetResourceForm()
      setMessage(`Deleted ${data.deletedCount || 0} resource(s).${data.missingCount ? ` ${data.missingCount} already missing.` : ''}`)
      await loadData()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const applyBulkResourceAction = async () => {
    const ids = [...selectedResourceIds]
    if (!ids.length || !bulkResourceAction) return

    if (bulkResourceAction === 'delete') {
      await deleteSelectedResources()
      return
    }

    const published = bulkResourceAction === 'publish'
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/resources/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, published }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(formatApiError(data, 'Bulk status update failed'))
      setBulkResourceAction('')
      setMessage(`${published ? 'Published' : 'Moved to draft'} ${data.modifiedCount || 0} resource(s).`)
      await loadData()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const fetchYouTubePreview = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/resources/youtube/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl, language: resourceForm.language }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(formatApiError(data, 'YouTube preview failed'))
      const mappedVideo = mapYouTubeToForm(data)

      setResourceForm((current) => ({
        ...current,
        ...mappedVideo,
        categoryId: current.categoryId || categories[0]?._id || '',
        published: current.published,
        featured: current.featured,
        description: current.description,
        transcriptText: '',
      }))
      setMessage('YouTube metadata loaded. Add an optional description before saving if needed.')
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const uploadResourceFile = async (file) => {
    if (!file) return
    if (file.size > MAX_UPLOAD_SIZE) {
      setError('File must be 50 MB or smaller.')
      return
    }
    if (!isAllowedUpload(file)) {
      setError('Only image, PDF, text, ZIP, Office, or generic files can be uploaded.')
      return
    }

    setUploading(true)
    setError('')
    setMessage('')
    try {
      const fileHash = await sha256File(file)
      const existingResponse = await fetch(`/api/admin/assets?fileHash=${fileHash}`)
      const existingAsset = await readResponseBody(existingResponse)

      if (!existingResponse.ok && existingResponse.status !== 404) {
        setError(formatApiError(existingAsset, 'Could not check for an existing asset.'))
        return
      }

      if (existingAsset?._id) {
        applyAssetToResourceForm(existingAsset, file)
        setMessage('This file already exists in ImageKit. Reusing the existing asset.')
        return
      }

      const authResponse = await fetch('/api/admin/imagekit/auth', { method: 'POST' })
      const auth = await authResponse.json()
      if (!authResponse.ok) throw new Error(auth.error || 'ImageKit auth failed')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileName', file.name)
      formData.append('publicKey', auth.publicKey)
      formData.append('token', auth.token)
      formData.append('expire', auth.expire)
      formData.append('signature', auth.signature)
      formData.append('folder', '/resources')

      const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: formData,
      })
      const uploadResult = await uploadResponse.json()
      if (!uploadResponse.ok) throw new Error(uploadResult.message || uploadResult.error || 'ImageKit upload failed')

      const assetResponse = await fetch('/api/admin/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileHash,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          imagekitFileId: uploadResult.fileId,
          imagekitUrl: uploadResult.url,
          thumbnailUrl: uploadResult.thumbnailUrl || '',
          folder: uploadResult.folder || '/resources',
        }),
      })
      const asset = await assetResponse.json()
      if (!assetResponse.ok) throw new Error(asset.error || 'Asset registration failed')

      applyAssetToResourceForm(asset, file)
      setMessage('File uploaded and attached. Save the resource to publish it.')
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const applyAssetToResourceForm = (asset, file) => {
    const mimeType = file?.type || asset.mimeType || ''
    setResourceForm((current) => ({
      ...current,
      type: current.type === 'youtube' || current.type === 'link' ? inferResourceType(mimeType) : current.type,
      title: current.title || asset.fileName || file?.name || '',
      url: asset.imagekitUrl,
      thumbnailUrl: asset.thumbnailUrl || current.thumbnailUrl,
      assetId: asset._id,
      imagekitFileId: asset.imagekitFileId,
      imagekitUrl: asset.imagekitUrl,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      size: asset.size,
    }))
  }

  const previewPlaylist = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    setPlaylistPreview(null)
    setPlaylistImportProgress(null)
    setPlaylistVisibleCount(PLAYLIST_VISIBLE_BATCH_SIZE)
    try {
      const response = await fetch('/api/admin/resources/youtube/playlist/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: playlistUrl, limit: PLAYLIST_IMPORT_PAGE_SIZE }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(formatApiError(data, 'Playlist preview failed'))
      setPlaylistPreview(data)
      setSelectedPlaylistVideos(new Set((data.videos || []).map((video) => video.youtubeId)))
      setPlaylistVisibleCount(PLAYLIST_VISIBLE_BATCH_SIZE)
      setMessage(`${data.videos?.length || 0} of ${data.totalCount || data.videos?.length || 0} playlist videos loaded for review.`)
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const loadMorePlaylistVideos = async () => {
    if (!playlistPreview?.nextPageToken) return

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const nextPage = await fetchPlaylistPage(playlistUrl, playlistPreview.nextPageToken)
      setPlaylistPreview((current) => ({
        ...nextPage,
        videos: [...(current?.videos || []), ...(nextPage.videos || [])],
        totalCount: nextPage.totalCount || current?.totalCount || nextPage.videos?.length || 0,
      }))
      setSelectedPlaylistVideos((current) => {
        const next = new Set(current)
        for (const video of nextPage.videos || []) next.add(video.youtubeId)
        return next
      })
      setMessage(`${nextPage.videos?.length || 0} more playlist videos loaded for review.`)
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const importPlaylist = async () => {
    if (!resourceForm.categoryId) {
      setError('Select a category before importing a playlist.')
      return
    }
    if (!playlistPreview?.playlistId) return

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const videos = (playlistPreview.videos || [])
        .filter((video) => selectedPlaylistVideos.has(video.youtubeId))
        .map((video) => ({
          ...mapYouTubeToPayload(video),
          level: resourceForm.level,
          language: resourceForm.language,
          tags: splitTags(resourceForm.tagsInput),
          topicTags: splitTags(resourceForm.topicTagsInput),
          published: resourceForm.published,
          featured: false,
        }))

      setPlaylistImportProgress({
        processed: 0,
        total: videos.length,
        imported: 0,
        skipped: 0,
      })

      let importedCount = 0
      let skippedDuplicateCount = 0
      let processedCount = 0

      for (let index = 0; index < videos.length; index += PLAYLIST_IMPORT_REQUEST_SIZE) {
        const batch = videos.slice(index, index + PLAYLIST_IMPORT_REQUEST_SIZE)
        const response = await fetch('/api/admin/resources/youtube/playlist/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryId: resourceForm.categoryId,
            playlistId: playlistPreview.playlistId,
            videos: batch,
          }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(formatApiError(data, 'Playlist import failed'))

        importedCount += data.importedCount || 0
        skippedDuplicateCount += data.skippedDuplicateCount || 0
        processedCount += batch.length
        setPlaylistImportProgress({
          processed: processedCount,
          total: videos.length,
          imported: importedCount,
          skipped: skippedDuplicateCount,
        })
      }

      setMessage(`Imported ${importedCount} selected video(s). Skipped ${skippedDuplicateCount} duplicate(s).`)
      setPlaylistPreview(null)
      setPlaylistUrl('')
      setPlaylistVisibleCount(PLAYLIST_VISIBLE_BATCH_SIZE)
      await loadData()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
    setPlaylistImportProgress(null)
  }

  const moveCategoryToPosition = async (categoryId, targetPosition) => {
    const numericPosition = Math.trunc(Number(targetPosition))
    if (!Number.isFinite(numericPosition) || numericPosition < 1) {
      setError('Enter a valid category position.')
      return
    }

    const sourceIndex = categories.findIndex((category) => category._id === categoryId)
    if (sourceIndex < 0) return

    const targetIndex = Math.min(numericPosition, categories.length) - 1
    const next = [...categories]
    const [item] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, item)

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/resources/categories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: next.map((entry) => entry._id) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(formatApiError(data, 'Category move failed'))
      setMessage(`Category moved to #${targetIndex + 1}.`)
      await loadData()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const handleDragAutoScroll = (event) => {
    const edgeSize = 110
    const maxSpeed = 28
    if (event.clientY < edgeSize) {
      window.scrollBy({ top: -Math.max(8, maxSpeed * (1 - event.clientY / edgeSize)), behavior: 'auto' })
    } else if (window.innerHeight - event.clientY < edgeSize) {
      window.scrollBy({ top: Math.max(8, maxSpeed * (1 - (window.innerHeight - event.clientY) / edgeSize)), behavior: 'auto' })
    }
  }

  const getDropInsertionIndex = (event, index) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return event.clientY > rect.top + rect.height / 2 ? index + 1 : index
  }

  const handleCategoryDragOver = (event, index) => {
    if (saving || !draggedCategoryId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    handleDragAutoScroll(event)
    setCategoryDropPosition(getDropInsertionIndex(event, index))
  }

  const handleCategoryDrop = async () => {
    if (!draggedCategoryId || categoryDropPosition === null) {
      setDraggedCategoryId('')
      setCategoryDropPosition(null)
      return
    }

    const sourceIndex = categories.findIndex((category) => category._id === draggedCategoryId)
    if (sourceIndex < 0) {
      setDraggedCategoryId('')
      setCategoryDropPosition(null)
      return
    }

    const categoryId = draggedCategoryId
    const targetPosition = sourceIndex < categoryDropPosition ? categoryDropPosition : categoryDropPosition + 1
    setDraggedCategoryId('')
    setCategoryDropPosition(null)
    await moveCategoryToPosition(categoryId, targetPosition)
  }

  const moveResourceToPosition = async (resourceId, targetPosition) => {
    if (!canReorderResources) {
      setError('Select one category and clear type/search filters before reordering resources.')
      return
    }

    const numericPosition = Math.trunc(Number(targetPosition))
    if (!Number.isFinite(numericPosition) || numericPosition < 1) {
      setError('Enter a valid resource position.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/resources/move', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId,
          categoryId: reorderCategoryId,
          targetPosition: numericPosition,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(formatApiError(data, 'Resource move failed'))
      setMessage(`Resource moved to #${data.targetPosition || numericPosition}.`)
      await loadData()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const handleResourceDragOver = (event, index) => {
    if (!canReorderResources || !draggedResourceId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    handleDragAutoScroll(event)
    setResourceDropPosition(getDropInsertionIndex(event, index))
  }

  const handleResourceDrop = async () => {
    if (!draggedResourceId || resourceDropPosition === null) {
      setDraggedResourceId('')
      setResourceDropPosition(null)
      return
    }

    const sourceIndex = filteredResources.findIndex((resource) => resource._id === draggedResourceId)
    if (sourceIndex < 0) {
      setDraggedResourceId('')
      setResourceDropPosition(null)
      return
    }

    const resourceId = draggedResourceId
    const targetPosition = resourceOffset + (sourceIndex < resourceDropPosition ? resourceDropPosition : resourceDropPosition + 1)
    setDraggedResourceId('')
    setResourceDropPosition(null)
    await moveResourceToPosition(resourceId, targetPosition)
  }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme">
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6 mt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-theme-primary">Resource CMS</h2>
            <p className="text-sm text-theme-secondary">Create, organize, import, publish, and maintain learning materials.</p>
          </div>
          <Link href="/admin/dashboard" className="px-4 py-3 text-sm font-bold bg-theme-surface text-theme-secondary border border-theme-border rounded-xl hover:text-theme-primary transition-all flex items-center justify-center">
            <i className="fas fa-arrow-left mr-2" />
            Dashboard
          </Link>
        </div>

        {message ? <Notice tone="success" text={message} /> : null}
        {error ? <Notice tone="error" text={error} /> : null}

        <div className="bg-theme-surface border border-theme-border rounded-2xl p-2 flex gap-2">
          <TabButton active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon="fa-layer-group" label="Resources" />
          <TabButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon="fa-folder-tree" label="Categories" />
          <TabButton active={activeTab === 'playlist'} onClick={() => setActiveTab('playlist')} icon="fa-list-ul" label="Playlist Import" />
        </div>

        {loading ? (
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 text-theme-secondary">Loading resource CMS...</div>
        ) : null}

        {!loading && activeTab === 'categories' ? (
          <section className="grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-6">
            <Panel title={editingCategoryId ? 'Edit Category' : 'Create Category'}>
              <div className="space-y-4">
                <Field label="Name"><input className="input-field" value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="Web Development" /></Field>
                <Field label="Slug"><input className="input-field" value={categoryForm.slug} onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })} placeholder="auto-generated if empty" /></Field>
                <Field label="Description"><textarea className="input-field min-h-24" value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} /></Field>
                <Field label="Icon">
                  <IconPicker value={categoryForm.icon} onChange={(icon) => setCategoryForm({ ...categoryForm, icon })} />
                </Field>
                <Field label="Color">
                  <ColorPicker value={categoryForm.color} onChange={(color) => setCategoryForm({ ...categoryForm, color })} />
                </Field>
                <ToggleRow label="Published" checked={categoryForm.published} onChange={(published) => setCategoryForm({ ...categoryForm, published })} />
                <ToggleRow label="Featured" checked={categoryForm.featured} onChange={(featured) => setCategoryForm({ ...categoryForm, featured })} />
                <div className="flex gap-3">
                  <button disabled={saving} onClick={saveCategory} className="flex-1 bg-theme-accent text-theme-accent-text py-3 rounded-xl font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save Category'}</button>
                  {editingCategoryId ? <button onClick={resetCategoryForm} className="px-4 py-3 rounded-xl border border-theme-border font-bold">Cancel</button> : null}
                </div>
              </div>
            </Panel>

            <Panel title={`Categories (${categories.length})`}>
              <div className="mb-4 rounded-xl border border-theme-border bg-theme-bg px-3 py-2 text-xs font-bold text-theme-secondary">
                Reorder: drag a category row, or type a position number for long jumps.
              </div>
              <div
                className="space-y-3"
                onDragOver={(event) => {
                  if (draggedCategoryId) handleDragAutoScroll(event)
                }}
              >
                {categories.map((category, index) => (
                  <div
                    key={category._id}
                    draggable={!saving}
                    onDragStart={(event) => {
                      if (saving) return
                      event.dataTransfer.effectAllowed = 'move'
                      setDraggedCategoryId(category._id)
                    }}
                    onDragEnd={() => {
                      setDraggedCategoryId('')
                      setCategoryDropPosition(null)
                    }}
                    onDragOver={(event) => {
                      handleCategoryDragOver(event, index)
                    }}
                    onDrop={(event) => {
                      if (saving) return
                      event.preventDefault()
                      handleCategoryDrop()
                    }}
                    className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${draggedCategoryId === category._id ? 'border-theme-accent bg-theme-accent/10 opacity-70' : 'border-theme-border'} ${categoryDropPosition === index ? 'border-t-4 border-t-theme-accent' : ''} ${categoryDropPosition === index + 1 ? 'border-b-4 border-b-theme-accent' : ''}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-theme-border bg-theme-bg text-theme-secondary ${saving ? 'cursor-not-allowed opacity-30' : 'cursor-grab active:cursor-grabbing'}`}
                        title="Drag to reorder"
                        aria-hidden="true"
                      >
                        <i className="fas fa-grip-vertical text-xs" />
                      </div>
                      <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-theme-progress-track flex items-center justify-center" style={{ color: category.color || 'var(--color-accent)' }}>
                          <i className={`fas ${category.icon || 'fa-book-open'}`} />
                        </span>
                        <div>
                          <h3 className="font-bold text-theme-primary truncate">{category.name}</h3>
                          <p className="text-xs text-theme-secondary">{category.slug} · {category.resourceCount || 0} resource(s)</p>
                        </div>
                      </div>
                    </div>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-start sm:justify-end gap-2">
                      <PositionMoveForm
                        currentPosition={index + 1}
                        total={categories.length}
                        disabled={saving}
                        label={`Move ${category.name} to position`}
                        onMove={(position) => moveCategoryToPosition(category._id, position)}
                      />
                      <StatusPill active={category.published} activeLabel="Published" inactiveLabel="Draft" />
                      <IconButton title="Edit" icon="fa-pen" onClick={() => editCategory(category)} />
                      <IconButton title="Delete" icon="fa-trash" danger onClick={() => deleteCategory(category)} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        ) : null}

        {!loading && activeTab === 'resources' ? (
          <section className="grid xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-6">
            <Panel title={editingResourceId ? 'Edit Resource' : 'Add Resource'}>
              <ResourceForm
                form={resourceForm}
                setForm={setResourceForm}
                categories={categories}
                youtubeUrl={youtubeUrl}
                setYoutubeUrl={setYoutubeUrl}
                fetchYouTubePreview={fetchYouTubePreview}
                saving={saving}
                uploading={uploading}
                uploadResourceFile={uploadResourceFile}
              />
              <div className="flex gap-3 mt-5">
                <button disabled={saving || !resourceForm.categoryId} onClick={saveResource} className="flex-1 bg-theme-accent text-theme-accent-text py-3 rounded-xl font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save Resource'}</button>
                {editingResourceId ? <button onClick={resetResourceForm} className="px-4 py-3 rounded-xl border border-theme-border font-bold">Cancel</button> : null}
              </div>
            </Panel>

            <div ref={resourcesPanelRef}>
            <Panel title={`Resources (${filteredResources.length}${resourceTotal ? ` of ${resourceTotal}` : ''})`}>
              <div className="grid sm:grid-cols-3 gap-3 mb-4 min-w-0">
                <select className="input-field" value={resourceFilter.categoryId} onChange={(event) => setResourceFilter({ ...resourceFilter, categoryId: event.target.value })}>
                  <option value="">All categories</option>
                  {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                </select>
                <select className="input-field" value={resourceFilter.type} onChange={(event) => setResourceFilter({ ...resourceFilter, type: event.target.value })}>
                  <option value="">All types</option>
                  {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input className="input-field" value={resourceFilter.q} onChange={(event) => setResourceFilter({ ...resourceFilter, q: event.target.value })} placeholder="Search" />
              </div>
              <div className="mb-4 flex flex-col gap-3 rounded-xl border border-theme-border bg-theme-bg p-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-3 text-sm font-bold text-theme-primary">
                  <input
                    type="checkbox"
                    checked={allVisibleResourcesSelected}
                    disabled={filteredResources.length === 0}
                    onChange={(event) => toggleAllVisibleResources(event.target.checked)}
                    className="h-4 w-4"
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  <span>Select visible resources</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-theme-secondary">{selectedResourceIds.size} selected</span>
                  <select
                    className="h-10 rounded-xl border border-theme-border bg-theme-surface px-3 text-sm font-bold text-theme-primary disabled:cursor-not-allowed disabled:opacity-50"
                    value={bulkResourceAction}
                    disabled={saving || selectedResourceIds.size === 0}
                    onChange={(event) => setBulkResourceAction(event.target.value)}
                  >
                    <option value="">Bulk action</option>
                    <option value="publish">Publish selected</option>
                    <option value="draft">Make selected draft</option>
                    <option value="delete">Delete selected</option>
                  </select>
                  <button
                    type="button"
                    disabled={saving || selectedResourceIds.size === 0 || !bulkResourceAction}
                    onClick={applyBulkResourceAction}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-theme-border bg-theme-surface px-4 text-sm font-bold text-theme-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <i className="fas fa-check text-xs" />
                    Apply
                  </button>
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-theme-border bg-theme-bg px-3 py-2 text-xs font-bold text-theme-secondary">
                {canReorderResources
                  ? 'Reorder: drag a resource row for nearby moves, or type a position number for long jumps.'
                  : 'Show one full category and clear type/search filters to reorder resources.'}
              </div>

              <div
                className="space-y-3"
                onDragOver={(event) => {
                  if (draggedResourceId) handleDragAutoScroll(event)
                }}
              >
                {filteredResources.map((resource, index) => (
                  <ResourceRow
                    key={resource._id}
                    resource={resource}
                    rowIndex={index}
                    currentPosition={resourceOffset + index + 1}
                    total={canReorderResources ? resourceTotal : filteredResources.length}
                    canReorder={canReorderResources && !saving}
                    isDragging={draggedResourceId === resource._id}
                    dropPosition={resourceDropPosition}
                    onDragStart={() => setDraggedResourceId(resource._id)}
                    onDragEnd={() => {
                      setDraggedResourceId('')
                      setResourceDropPosition(null)
                    }}
                    onDragOver={(event) => handleResourceDragOver(event, index)}
                    onDrop={() => handleResourceDrop()}
                    onMoveToPosition={(position) => moveResourceToPosition(resource._id, position)}
                    onEdit={() => editResource(resource)}
                    onDelete={() => deleteResource(resource)}
                    selected={selectedResourceIds.has(resource._id)}
                    onSelect={(checked) => toggleResourceSelection(resource._id, checked)}
                  />
                ))}
                {filteredResources.length === 0 ? <p className="text-theme-secondary text-sm py-8 text-center">No resources match this filter.</p> : null}
                {hasMoreResources || resourceOffset > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {hasMoreResources ? (
                      <button
                        onClick={loadNextResources}
                        disabled={loadingMoreResources}
                        className="w-full bg-theme-bg border border-theme-border py-3 rounded-xl font-bold text-theme-secondary hover:text-theme-primary disabled:opacity-60"
                      >
                        {loadingMoreResources ? 'Loading...' : 'Load Next Resources'}
                      </button>
                    ) : null}
                    {resourceOffset > 0 ? (
                      <button
                        onClick={loadPreviousResources}
                        disabled={loadingMoreResources}
                        className="w-full bg-theme-bg border border-theme-border py-3 rounded-xl font-bold text-theme-secondary hover:text-theme-primary disabled:opacity-60"
                      >
                        {loadingMoreResources ? 'Loading...' : 'Load Prev Resources'}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Panel>
            </div>
          </section>
        ) : null}

        {!loading && activeTab === 'playlist' ? (
          <section className="grid xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-6">
            <Panel title="Import YouTube Playlist">
              <div className="space-y-4">
                <Field label="Category">
                  <select className="input-field" value={resourceForm.categoryId} onChange={(event) => setResourceForm({ ...resourceForm, categoryId: event.target.value })}>
                    <option value="">Select category</option>
                    {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                  </select>
                </Field>
                <Field label="Playlist URL">
                  <input className="input-field" value={playlistUrl} onChange={(event) => setPlaylistUrl(event.target.value)} placeholder="https://www.youtube.com/playlist?list=..." />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Level"><SelectLevel value={resourceForm.level} onChange={(level) => setResourceForm({ ...resourceForm, level })} /></Field>
                  <Field label="Language"><SelectLanguage value={resourceForm.language} onChange={(language) => setResourceForm({ ...resourceForm, language })} /></Field>
                </div>
                <Field label="Tags"><input className="input-field" value={resourceForm.tagsInput} onChange={(event) => setResourceForm({ ...resourceForm, tagsInput: event.target.value })} placeholder="html, css, beginner" /></Field>
                <ToggleRow label="Publish after import" checked={resourceForm.published} onChange={(published) => setResourceForm({ ...resourceForm, published })} />
                <button disabled={saving || !playlistUrl} onClick={previewPlaylist} className="w-full bg-theme-bg border border-theme-border py-3 rounded-xl font-bold disabled:opacity-50">
                  {saving ? 'Loading...' : 'Preview Playlist'}
                </button>
                <button disabled={saving || !playlistPreview || selectedPlaylistVideos.size === 0} onClick={importPlaylist} className="w-full bg-theme-accent text-theme-accent-text py-3 rounded-xl font-bold disabled:opacity-50">
                  {saving && playlistImportProgress ? 'Importing...' : 'Import Selected Videos'}
                </button>
                {playlistImportProgress ? (
                  <div className="bg-theme-bg border border-theme-border rounded-xl p-3 text-sm text-theme-secondary">
                    <p className="font-bold text-theme-primary">
                      {playlistImportProgress.processed} of {playlistImportProgress.total} checked
                    </p>
                    <p>{playlistImportProgress.imported} imported / {playlistImportProgress.skipped} skipped</p>
                  </div>
                ) : null}
              </div>
            </Panel>

            <Panel
              title={playlistPreview ? `Preview (${selectedPlaylistVideos.size} selected of ${playlistPreview.totalCount || playlistPreview.videos.length})` : 'Playlist Preview'}
              action={playlistPreview?.nextPageToken ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={loadMorePlaylistVideos}
                  className="shrink-0 bg-theme-bg border border-theme-border px-4 py-2 rounded-xl text-sm font-bold text-theme-secondary hover:text-theme-primary disabled:opacity-60"
                >
                  {saving ? 'Loading...' : `Load Next ${PLAYLIST_IMPORT_PAGE_SIZE}`}
                </button>
              ) : null}
            >
              {!playlistPreview ? (
                <p className="text-theme-secondary text-sm py-10 text-center">Paste a playlist URL and preview it before importing.</p>
              ) : (
                <div className="space-y-3">
                  {playlistPreview.videos.slice(0, playlistVisibleCount).map((video) => (
                    <label key={video.youtubeId} className="border border-theme-border rounded-xl p-3 flex gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selectedPlaylistVideos.has(video.youtubeId)}
                        onChange={(event) => {
                          const next = new Set(selectedPlaylistVideos)
                          if (event.target.checked) next.add(video.youtubeId)
                          else next.delete(video.youtubeId)
                          setSelectedPlaylistVideos(next)
                        }}
                      />
                      <Image src={video.thumbnailUrl} alt="" width={96} height={56} className="w-24 h-14 rounded-lg object-cover bg-theme-bg shrink-0" />
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-theme-primary line-clamp-2">{video.title}</h3>
                        <p className="text-xs text-theme-secondary">{video.channelTitle} · {formatMinutes(video.durationSeconds)}</p>
                      </div>
                    </label>
                  ))}
                  {playlistVisibleCount < playlistPreview.videos.length ? (
                    <button
                      type="button"
                      onClick={() => setPlaylistVisibleCount((current) => Math.min(current + PLAYLIST_VISIBLE_BATCH_SIZE, playlistPreview.videos.length))}
                      className="w-full bg-theme-bg border border-theme-border py-3 rounded-xl font-bold text-theme-secondary hover:text-theme-primary"
                    >
                      Show More Loaded Videos
                    </button>
                  ) : null}
                </div>
              )}
            </Panel>
          </section>
        ) : null}
      </main>
    </div>
  )
}

function ResourceForm({ form, setForm, categories, youtubeUrl, setYoutubeUrl, fetchYouTubePreview, saving, uploading, uploadResourceFile }) {
  return (
    <div className="space-y-4">
      <Field label="Type">
        <select className="input-field" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
          {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <Field label="Category">
        <select className="input-field" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
          <option value="">Select category</option>
          {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
        </select>
      </Field>

      {form.type === 'youtube' ? (
        <div className="bg-theme-bg border border-theme-border rounded-xl p-3 space-y-3">
          <Field label="YouTube URL">
            <input className="input-field" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://youtu.be/..." />
          </Field>
          <button disabled={saving || !youtubeUrl} onClick={fetchYouTubePreview} className="w-full bg-theme-surface border border-theme-border py-2.5 rounded-xl font-bold disabled:opacity-50">
            Fetch Metadata
          </button>
        </div>
      ) : null}

      {['pdf', 'image', 'file'].includes(form.type) ? (
        <div className="bg-theme-bg border border-theme-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-theme-primary">Upload File</p>
              <p className="text-xs text-theme-secondary">Duplicate files are detected by SHA-256 and reused.</p>
            </div>
            <label className="px-3 py-2 rounded-xl bg-theme-surface border border-theme-border text-sm font-bold cursor-pointer">
              {uploading ? 'Uploading...' : 'Choose'}
              <input
                type="file"
                className="hidden"
                accept={form.type === 'pdf' ? 'application/pdf,.pdf' : form.type === 'image' ? 'image/*' : undefined}
                disabled={uploading}
                onChange={(event) => uploadResourceFile(event.target.files?.[0])}
              />
            </label>
          </div>
          {form.assetId ? (
            <div className="rounded-xl bg-theme-surface border border-theme-border p-3 text-sm">
              <p className="font-bold text-theme-primary truncate">{form.fileName}</p>
              <p className="text-xs text-theme-secondary">{form.mimeType || 'file'} · {formatFileSize(form.size)}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <Field label="Title"><input className="input-field" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
      <Field label="Description (optional)">
        <textarea
          className="input-field min-h-24"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder="Add any notes or summary you want to save with this resource."
        />
      </Field>
      <Field label={form.type === 'youtube' ? 'Source URL' : 'Resource URL'}>
        <input className="input-field" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://..." />
      </Field>
      <Field label="Thumbnail URL"><input className="input-field" value={form.thumbnailUrl} onChange={(event) => setForm({ ...form, thumbnailUrl: event.target.value })} placeholder="optional" /></Field>
      {form.type === 'youtube' ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="YouTube ID"><input className="input-field" value={form.youtubeId} onChange={(event) => setForm({ ...form, youtubeId: event.target.value })} /></Field>
          <Field label="Duration seconds"><input className="input-field" type="number" value={form.durationSeconds} onChange={(event) => setForm({ ...form, durationSeconds: Number(event.target.value) })} /></Field>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Level"><SelectLevel value={form.level} onChange={(level) => setForm({ ...form, level })} /></Field>
        <Field label="Language"><SelectLanguage value={form.language} onChange={(language) => setForm({ ...form, language })} /></Field>
      </div>
      <Field label="Tags"><input className="input-field" value={form.tagsInput} onChange={(event) => setForm({ ...form, tagsInput: event.target.value })} placeholder="comma separated" /></Field>
      <Field label="Topic Tags"><input className="input-field" value={form.topicTagsInput} onChange={(event) => setForm({ ...form, topicTagsInput: event.target.value })} placeholder="javascript, arrays" /></Field>
      <QuizQuestionsField form={form} setForm={setForm} />
      <div className="grid grid-cols-2 gap-3">
        <ToggleRow label="Published" checked={form.published} onChange={(published) => setForm({ ...form, published })} />
        <ToggleRow label="Featured" checked={form.featured} onChange={(featured) => setForm({ ...form, featured })} />
      </div>
    </div>
  )
}

function QuizQuestionsField({ form, setForm }) {
  const quizQuestions = Array.isArray(form.quizQuestions) ? form.quizQuestions : []
  const [tab, setTab] = useState('txt')
  const [txtInput, setTxtInput] = useState('')
  const [jsonInput, setJsonInput] = useState('')
  const [error, setError] = useState('')
  const serializedQuestions = JSON.stringify(quizQuestions)
  const examples = {
    txt: `Q1. What is the capital of France?
1. Berlin
2. London
3. Paris
4. Madrid
*3(ans)
**Paris is the capital and largest city of France.

Q2. Which is a JavaScript framework?
1. Django
2. Flask
3. React
4. Laravel
5. Spring
*3(ans)
**`,
    json: `[
  {
    "question": "What is the capital of France?",
    "options": ["Berlin", "London", "Paris", "Madrid"],
    "correct": 2,
    "explanation": "Paris is the capital of France."
  },
  {
    "question": "Which is a JS framework?",
    "options": ["Django", "Flask", "React"],
    "correct": 2,
    "explanation": ""
  }
]`,
  }

  useEffect(() => {
    const questions = JSON.parse(serializedQuestions || '[]')
    setTxtInput(formatQuestionsAsTxt(questions))
    setJsonInput(formatQuestionsAsJson(questions))
    setError('')
  }, [serializedQuestions])

  const parseInput = () => {
    setError('')
    try {
      const questions = tab === 'json' ? parseJSON(jsonInput) : parseTXT(txtInput)
      if (!questions.length) {
        setError('No valid quiz questions found.')
        return
      }
      setForm({ ...form, quizQuestions: normalizeQuizQuestionsForForm(questions) })
    } catch (err) {
      setError(err.message || 'Quiz questions could not be parsed.')
    }
  }

  const clearQuestions = () => {
    setTxtInput('')
    setJsonInput('')
    setError('')
    setForm({ ...form, quizQuestions: [] })
  }

  return (
    <div className="bg-theme-bg border border-theme-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-theme-primary">Quiz Questions (optional)</p>
          <p className="text-xs text-theme-secondary">Paste TXT or JSON exam-style questions. Leave blank to skip the resource quiz.</p>
        </div>
        {quizQuestions.length > 0 ? (
          <span className="px-2 py-1 rounded-lg bg-theme-success-bg text-xs font-bold text-theme-success-text shrink-0">
            {quizQuestions.length} saved
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'txt', label: 'TXT', icon: 'fa-file-lines' },
          { id: 'json', label: 'JSON', icon: 'fa-code' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => { setTab(item.id); setError('') }}
            className={`h-10 rounded-xl text-sm font-bold transition-all ${tab === item.id ? 'bg-theme-accent text-theme-accent-text' : 'bg-theme-surface border border-theme-border text-theme-secondary hover:text-theme-primary'}`}
          >
            <i className={`fas ${item.icon} mr-2`} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'txt' ? (
        <div className="space-y-3">
          <textarea
            className="input-field min-h-40 font-mono text-sm resize-y"
            value={txtInput}
            onChange={(event) => setTxtInput(event.target.value)}
            placeholder="Paste questions in TXT format..."
            spellCheck="false"
            autoComplete="off"
          />
          <FormatExample title="TXT Format Example" code={examples.txt} />
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            className="input-field min-h-40 font-mono text-sm resize-y"
            value={jsonInput}
            onChange={(event) => setJsonInput(event.target.value)}
            placeholder="Paste JSON array..."
            spellCheck="false"
            autoComplete="off"
          />
          <FormatExample title="JSON Format Example" code={examples.json} />
        </div>
      )}

      {error ? <div className="rounded-xl border border-theme-error-border bg-theme-error-bg px-3 py-2 text-sm font-bold text-theme-error-text">{error}</div> : null}

      {quizQuestions.length > 0 ? (
        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
          {quizQuestions.slice(0, 8).map((question, index) => (
            <div key={index} className="bg-theme-surface border border-theme-border rounded-xl p-3 text-xs">
              <p className="font-bold text-theme-primary whitespace-pre-wrap">{index + 1}. {question.question}</p>
              <p className="text-theme-secondary mt-1">{question.options?.length || 0} options - correct option {(Number(question.correct) || 0) + 1}</p>
            </div>
          ))}
          {quizQuestions.length > 8 ? <p className="text-xs font-bold text-theme-secondary text-center">+{quizQuestions.length - 8} more question(s)</p> : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={parseInput} className="h-11 rounded-xl bg-theme-surface border border-theme-border text-theme-primary font-bold hover:border-theme-accent/50 transition-all">
          Parse Quiz
        </button>
        <button type="button" onClick={clearQuestions} className="h-11 rounded-xl bg-theme-surface border border-theme-border text-theme-secondary font-bold hover:text-theme-primary transition-all">
          Clear
        </button>
      </div>
    </div>
  )
}

function ResourceRow({
  resource,
  rowIndex,
  currentPosition,
  total,
  canReorder,
  isDragging,
  dropPosition,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onMoveToPosition,
  onEdit,
  onDelete,
  selected,
  onSelect,
}) {
  const [positionInput, setPositionInput] = useState(String(currentPosition))

  useEffect(() => {
    setPositionInput(String(currentPosition))
  }, [currentPosition])

  const submitPosition = (event) => {
    event.preventDefault()
    if (!canReorder) return
    onMoveToPosition(positionInput)
  }

  return (
    <div
      draggable={canReorder}
      onDragStart={(event) => {
        if (!canReorder) return
        event.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        onDragOver(event)
      }}
      onDrop={(event) => {
        if (!canReorder) return
        event.preventDefault()
        onDrop()
      }}
      className={`border rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0 overflow-hidden transition-all ${isDragging ? 'border-theme-accent bg-theme-accent/10 opacity-70' : 'border-theme-border'} ${dropPosition === rowIndex ? 'border-t-4 border-t-theme-accent' : ''} ${dropPosition === rowIndex + 1 ? 'border-b-4 border-b-theme-accent' : ''}`}
    >
      <div className="flex gap-3 min-w-0 flex-1">
        <div
          className={`mt-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-theme-border bg-theme-bg text-theme-secondary ${canReorder ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-30'}`}
          title={canReorder ? 'Drag to reorder' : 'Select one category to reorder'}
          aria-hidden="true"
        >
          <i className="fas fa-grip-vertical text-xs" />
        </div>
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelect(event.target.checked)}
          className="mt-5 h-4 w-4 shrink-0"
          style={{ accentColor: 'var(--color-accent)' }}
          aria-label={`Select ${resource.title}`}
        />
        {resource.thumbnailUrl ? <img src={resource.thumbnailUrl} alt="" className="w-24 h-14 rounded-lg object-cover bg-theme-progress-track shrink-0" /> : <div className="w-14 h-14 rounded-xl bg-theme-progress-track flex items-center justify-center shrink-0"><i className="fas fa-file-lines text-theme-secondary" /></div>}
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 mb-1">
            <span className="px-2 py-1 rounded-lg bg-theme-progress-track text-xs font-bold text-theme-secondary">{typeLabels[resource.type] || resource.type}</span>
            <StatusPill active={resource.published} activeLabel="Published" inactiveLabel="Draft" />
            {resource.featured ? <span className="px-2 py-1 rounded-lg bg-theme-success-bg text-xs font-bold text-theme-success-text">Featured</span> : null}
          </div>
          <h3 className="font-bold text-theme-primary truncate max-w-full">{resource.title}</h3>
          <p className="text-xs text-theme-secondary truncate">
            {resource.categoryId?.name || 'No category'} · {resource.level} · {resource.language}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end shrink-0">
        <form onSubmit={submitPosition} className="flex h-9 items-center gap-1 rounded-xl border border-theme-border bg-theme-bg px-2">
          <span className="text-xs font-black text-theme-secondary">#</span>
          <input
            type="number"
            min="1"
            max={Math.max(total, 1)}
            value={positionInput}
            disabled={!canReorder}
            onClick={(event) => event.stopPropagation()}
            onDragStart={(event) => event.preventDefault()}
            onChange={(event) => setPositionInput(event.target.value)}
            className="h-7 w-14 bg-transparent text-center text-sm font-bold text-theme-primary outline-none disabled:opacity-40"
            aria-label={`Move ${resource.title} to position`}
          />
          <button
            type="submit"
            disabled={!canReorder}
            className="h-7 w-7 rounded-lg text-theme-secondary hover:text-theme-primary disabled:cursor-not-allowed disabled:opacity-30"
            title="Move to position"
          >
            <i className="fas fa-arrow-right text-xs" />
          </button>
        </form>
        <IconButton title="Edit" icon="fa-pen" onClick={onEdit} />
        <IconButton title="Delete" icon="fa-trash" danger onClick={onDelete} />
      </div>
    </div>
  )
}

function PositionMoveForm({ currentPosition, total, disabled, label, onMove }) {
  const [positionInput, setPositionInput] = useState(String(currentPosition))

  useEffect(() => {
    setPositionInput(String(currentPosition))
  }, [currentPosition])

  const submitPosition = (event) => {
    event.preventDefault()
    if (disabled) return
    onMove(positionInput)
  }

  return (
    <form onSubmit={submitPosition} className="flex h-9 items-center gap-1 rounded-xl border border-theme-border bg-theme-bg px-2">
      <span className="text-xs font-black text-theme-secondary">#</span>
      <input
        type="number"
        min="1"
        max={Math.max(total, 1)}
        value={positionInput}
        disabled={disabled}
        onClick={(event) => event.stopPropagation()}
        onDragStart={(event) => event.preventDefault()}
        onChange={(event) => setPositionInput(event.target.value)}
        className="h-7 w-14 bg-transparent text-center text-sm font-bold text-theme-primary outline-none disabled:opacity-40"
        aria-label={label}
      />
      <button
        type="submit"
        disabled={disabled}
        className="h-7 w-7 rounded-lg text-theme-secondary hover:text-theme-primary disabled:cursor-not-allowed disabled:opacity-30"
        title="Move to position"
      >
        <i className="fas fa-arrow-right text-xs" />
      </button>
    </form>
  )
}

function Panel({ title, action, children }) {
  return (
    <section className="bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-sm min-w-0">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h3 className="min-w-0 text-lg font-extrabold text-theme-primary">{title}</h3>
        {action ? <div className="justify-self-end">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }) {
  return <label className="block"><span className="block text-sm font-bold text-theme-primary mb-1">{label}</span>{children}</label>
}

function FormatExample({ title, code }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-theme-border">
        <span className="text-xs font-bold text-theme-secondary">{title}</span>
        <button type="button" onClick={copy} className="text-xs text-theme-accent hover:underline">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 text-xs text-theme-secondary overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">{code}</pre>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 bg-theme-bg border border-theme-border rounded-xl px-4 py-3">
      <span className="text-sm font-bold text-theme-primary">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

function IconPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {categoryIcons.map((icon) => (
        <button
          key={icon.value}
          type="button"
          title={icon.label}
          onClick={() => onChange(icon.value)}
          className={`h-12 rounded-xl border flex items-center justify-center transition-all ${value === icon.value ? 'bg-theme-accent text-theme-accent-text border-theme-accent' : 'bg-theme-bg border-theme-border text-theme-secondary hover:text-theme-primary'}`}
        >
          <i className={`fas ${icon.value}`} />
        </button>
      ))}
    </div>
  )
}

function ColorPicker({ value, onChange }) {
  const selectedValue = String(value || '').toLowerCase()

  return (
    <div className="grid grid-cols-5 gap-2">
      {categoryColors.map((color) => {
        const isSelected = selectedValue === color.value.toLowerCase()

        return (
          <button
            key={color.value}
            type="button"
            title={`${color.label} (${color.value})`}
            onClick={() => onChange(color.value)}
            className={`h-11 rounded-xl border transition-all ${isSelected ? 'border-theme-accent ring-2 ring-theme-accent ring-offset-2 ring-offset-theme-surface' : 'border-theme-border hover:border-theme-accent/70'}`}
            style={{ backgroundColor: color.value }}
          >
            <span className="sr-only">{color.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex-1 px-3 py-3 rounded-xl text-sm font-bold transition-all ${active ? 'bg-theme-accent text-theme-accent-text' : 'text-theme-secondary hover:text-theme-primary'}`}>
      <i className={`fas ${icon} mr-2`} />
      {label}
    </button>
  )
}

function IconButton({ title, icon, disabled, danger, onClick }) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all disabled:opacity-40 ${danger ? 'bg-theme-error-bg border-theme-error-border text-theme-error-text' : 'bg-theme-bg border-theme-border text-theme-secondary hover:text-theme-primary'}`}
    >
      <i className={`fas ${icon} text-sm`} />
    </button>
  )
}

function StatusPill({ active, activeLabel, inactiveLabel }) {
  return (
    <span className={`h-9 px-3 rounded-xl inline-flex items-center justify-center text-xs font-bold shrink-0 ${active ? 'bg-theme-success-bg text-theme-success-text' : 'bg-theme-bg text-theme-secondary'}`}>
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}

function Notice({ tone, text }) {
  const classes = tone === 'error'
    ? 'bg-theme-error-bg border-theme-error-border text-theme-error-text'
    : 'bg-theme-success-bg border-theme-success-border text-theme-success-text'
  return <div className={`border rounded-xl px-4 py-3 text-sm font-bold ${classes}`}>{text}</div>
}

function SelectLevel({ value, onChange }) {
  return (
    <select className="input-field" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="beginner">Beginner</option>
      <option value="intermediate">Intermediate</option>
      <option value="advanced">Advanced</option>
    </select>
  )
}

function SelectLanguage({ value, onChange }) {
  return (
    <select className="input-field" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="bn">Bangla</option>
      <option value="en">English</option>
      <option value="hi">Hindi</option>
      <option value="mixed">Mixed</option>
      <option value="other">Other</option>
    </select>
  )
}

function normalizeQuizQuestionsForForm(questions = []) {
  if (!Array.isArray(questions)) return []

  return questions.map((question, index) => {
    const normalizedOptions = Array.isArray(question.options) ? question.options.map((option) => String(option || '')) : []
    const parsedCorrect = Number(question.correct)
    const validCorrect = Number.isFinite(parsedCorrect) && parsedCorrect >= 0 && parsedCorrect < normalizedOptions.length ? parsedCorrect : 0

    return {
      question: String(question.question || ''),
      options: normalizedOptions,
      correct: validCorrect,
      explanation: question.explanation ? String(question.explanation) : '',
      order: Number.isFinite(Number(question.order)) ? Number(question.order) : index + 1,
    }
  }).filter((question) => question.question && question.options.length >= 2)
}

function normalizeQuizQuestionsForSave(questions = []) {
  return normalizeQuizQuestionsForForm(questions).map((question, index) => ({
    ...question,
    order: index + 1,
  }))
}

function formatQuestionsAsTxt(questions = []) {
  if (!questions.length) return ''

  return questions.map((question, index) => {
    const lines = [`Q${index + 1}. ${question.question}`]
    question.options.forEach((option, optionIndex) => lines.push(`${optionIndex + 1}. ${option}`))
    lines.push(`*${Number(question.correct) + 1}(ans)`)
    if (question.explanation) lines.push(`** ${question.explanation}`)
    return lines.join('\n')
  }).join('\n\n')
}

function formatQuestionsAsJson(questions = []) {
  if (!questions.length) return ''

  return JSON.stringify(
    questions.map((question) => ({
      question: question.question,
      options: question.options,
      correct: question.correct,
      explanation: question.explanation || '',
    })),
    null,
    2,
  )
}

function resourceFormToPayload(form) {
  return {
    categoryId: form.categoryId,
    type: form.type,
    title: form.title,
    description: form.description || '',
    url: form.url,
    thumbnailUrl: form.thumbnailUrl,
    youtubeId: form.youtubeId,
    youtubePlaylistId: form.youtubePlaylistId,
    channelTitle: form.channelTitle,
    durationSeconds: Number(form.durationSeconds) || 0,
    assetId: form.assetId,
    imagekitFileId: form.imagekitFileId,
    imagekitUrl: form.imagekitUrl,
    fileName: form.fileName,
    mimeType: form.mimeType,
    size: Number(form.size) || 0,
    level: form.level,
    language: form.language,
    tags: splitTags(form.tagsInput),
    topicTags: splitTags(form.topicTagsInput),
    quizQuestions: normalizeQuizQuestionsForSave(form.quizQuestions),
    published: form.published,
    featured: form.featured,
    metadataSource: form.youtubeId ? 'youtube' : 'manual',
  }
}

async function prepareResourceForSave(form, youtubeUrl, categories) {
  if (form.type !== 'youtube' || (form.youtubeId && form.title)) return form
  const sourceUrl = youtubeUrl || form.url
  if (!sourceUrl) return form

  const response = await fetch('/api/admin/resources/youtube/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: sourceUrl, language: form.language }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(formatApiError(data, 'Could not fetch YouTube metadata'))

  return {
    ...form,
    ...mapYouTubeToForm(data),
    categoryId: form.categoryId || categories[0]?._id || '',
    description: form.description,
    published: form.published,
    featured: form.featured,
    transcriptText: '',
    level: form.level,
    language: form.language,
    tagsInput: form.tagsInput,
    topicTagsInput: form.topicTagsInput,
    quizQuestions: form.quizQuestions,
  }
}

function mapYouTubeToForm(video) {
  return {
    type: 'youtube',
    title: video.title || '',
    description: '',
    transcriptText: '',
    url: video.url || '',
    thumbnailUrl: video.thumbnailUrl || '',
    youtubeId: video.youtubeId || '',
    youtubePlaylistId: video.youtubePlaylistId || '',
    channelTitle: video.channelTitle || '',
    durationSeconds: video.durationSeconds || 0,
  }
}

function mapYouTubeToPayload(video) {
  return {
    ...mapYouTubeToForm(video),
    sourcePublishedAt: video.sourcePublishedAt,
    metadataSource: 'youtube',
  }
}

async function fetchPlaylistPage(url, pageToken = '') {
  const response = await fetch('/api/admin/resources/youtube/playlist/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, limit: PLAYLIST_IMPORT_PAGE_SIZE, pageToken }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(formatApiError(data, 'Playlist preview failed'))
  return data
}

function splitTags(value) {
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function getCategoryId(resource) {
  return typeof resource.categoryId === 'object' ? resource.categoryId?._id : resource.categoryId
}

function buildResourceListParams(filter, offset) {
  const params = new URLSearchParams({
    limit: String(ADMIN_RESOURCE_PAGE_SIZE),
    offset: String(offset),
  })
  if (filter.categoryId) params.set('categoryId', filter.categoryId)
  if (filter.type) params.set('type', filter.type)
  const q = filter.q.trim()
  if (q) params.set('q', q)
  return params
}

function formatMinutes(seconds) {
  const minutes = Math.round((Number(seconds) || 0) / 60)
  return minutes ? `${minutes} min` : 'Duration unknown'
}

function formatApiError(data, fallback) {
  if (Array.isArray(data?.details) && data.details.length > 0) {
    return data.details.map((item) => {
      const path = item.path ? `${item.path}: ` : ''
      return `${path}${item.message}`
    }).join(' · ')
  }

  return data?.error || fallback
}

async function readResponseBody(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

function inferResourceType(mimeType) {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType?.startsWith('image/')) return 'image'
  return 'file'
}

function formatFileSize(size) {
  const bytes = Number(size) || 0
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

async function sha256File(file) {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
