'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  '#ea7a53',
  '#081126',
  '#8fd1bd',
  '#f6eecf',
  '#16a34a',
  '#dc2626',
  '#ea7a53',
  '#081126',
  '#fff8e7',
  '#fff9e3',
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
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [playlistPreview, setPlaylistPreview] = useState(null)
  const [selectedPlaylistVideos, setSelectedPlaylistVideos] = useState(new Set())
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
      setResourceOffset(resourceItems.length)
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

  const loadMoreResources = async () => {
    setLoadingMoreResources(true)
    setError('')
    try {
      const params = buildResourceListParams(resourceFilter, resourceOffset)
      const response = await fetch(`/api/admin/resources?${params.toString()}`)
      if (response.status === 401) {
        router.push('/admin')
        return
      }
      if (!response.ok) throw new Error('Resource CMS load failed')

      const data = await response.json()
      const items = data.resources || []
      setResources((current) => [...current, ...items])
      setResourceOffset((current) => current + items.length)
      setResourceTotal(data.totalCount || resourceTotal)
      setHasMoreResources(Boolean(data.hasMore))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingMoreResources(false)
    }
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
      description: fullResource.type === 'youtube' ? '' : fullResource.description || '',
      transcriptText: fullResource.transcriptText || '',
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
        transcriptText: mappedVideo.transcriptText || current.transcriptText,
      }))
      setMessage(data.transcriptText ? 'YouTube metadata and transcript loaded. Review and save it.' : 'YouTube metadata loaded. Transcript was not available.')
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
    try {
      const response = await fetch('/api/admin/resources/youtube/playlist/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: playlistUrl, limit: 50 }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(formatApiError(data, 'Playlist preview failed'))
      setPlaylistPreview(data)
      setSelectedPlaylistVideos(new Set((data.videos || []).map((video) => video.youtubeId)))
      setMessage(`${data.videos?.length || 0} playlist videos loaded for review.`)
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

      const response = await fetch('/api/admin/resources/youtube/playlist/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: resourceForm.categoryId,
          playlistId: playlistPreview.playlistId,
          videos,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(formatApiError(data, 'Playlist import failed'))
      setMessage(`Imported ${data.importedCount} video(s). Skipped ${data.skippedDuplicateCount} duplicate(s).`)
      setPlaylistPreview(null)
      setPlaylistUrl('')
      await loadData()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const moveItem = async (kind, id, direction) => {
    if (kind === 'resources') {
      if (!resourceFilter.categoryId) {
        setError('Select a category before reordering resources.')
        return
      }
      if (resourceFilter.type || resourceFilter.q.trim()) {
        setError('Clear type and search filters before reordering resources.')
        return
      }
      if (hasMoreResources || filteredResources.length !== resourceTotal) {
        setError('Load all resources in this category before reordering.')
        return
      }
    }

    const list = kind === 'categories' ? [...categories] : [...filteredResources]
    const index = list.findIndex((item) => item._id === id)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= list.length) return

    const next = [...list]
    const [item] = next.splice(index, 1)
    next.splice(targetIndex, 0, item)

    const endpoint = kind === 'categories'
      ? '/api/admin/resources/categories/reorder'
      : '/api/admin/resources/reorder'
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderedIds: next.map((entry) => entry._id),
        ...(kind === 'resources' ? { categoryId: resourceFilter.categoryId } : {}),
      }),
    })
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'Reorder failed')
      return
    }
    await loadData()
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
              <div className="space-y-3">
                {categories.map((category, index) => (
                  <div key={category._id} className="border border-theme-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-theme-bg flex items-center justify-center" style={{ color: category.color || 'var(--color-accent)' }}>
                          <i className={`fas ${category.icon || 'fa-book-open'}`} />
                        </span>
                        <div>
                          <h3 className="font-bold text-theme-primary truncate">{category.name}</h3>
                          <p className="text-xs text-theme-secondary">{category.slug} · {category.resourceCount || 0} resource(s)</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-start sm:justify-end gap-2">
                      <IconButton title="Move up" icon="fa-arrow-up" disabled={index === 0} onClick={() => moveItem('categories', category._id, -1)} />
                      <IconButton title="Move down" icon="fa-arrow-down" disabled={index === categories.length - 1} onClick={() => moveItem('categories', category._id, 1)} />
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

              <div className="space-y-3">
                {filteredResources.map((resource, index) => (
                  <ResourceRow
                    key={resource._id}
                    resource={resource}
                    index={index}
                    total={filteredResources.length}
                    onMove={(direction) => moveItem('resources', resource._id, direction)}
                    onEdit={() => editResource(resource)}
                    onDelete={() => deleteResource(resource)}
                  />
                ))}
                {filteredResources.length === 0 ? <p className="text-theme-secondary text-sm py-8 text-center">No resources match this filter.</p> : null}
                {hasMoreResources ? (
                  <button
                    onClick={loadMoreResources}
                    disabled={loadingMoreResources}
                    className="w-full bg-theme-bg border border-theme-border py-3 rounded-xl font-bold text-theme-secondary hover:text-theme-primary disabled:opacity-60"
                  >
                    {loadingMoreResources ? 'Loading...' : 'Load More Resources'}
                  </button>
                ) : null}
              </div>
            </Panel>
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
                  Import Selected Videos
                </button>
              </div>
            </Panel>

            <Panel title={playlistPreview ? `Preview (${selectedPlaylistVideos.size} selected)` : 'Playlist Preview'}>
              {!playlistPreview ? (
                <p className="text-theme-secondary text-sm py-10 text-center">Paste a playlist URL and preview it before importing.</p>
              ) : (
                <div className="space-y-3">
                  {playlistPreview.videos.map((video) => (
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
                      <img src={video.thumbnailUrl} alt="" className="w-24 h-14 rounded-lg object-cover bg-theme-bg shrink-0" />
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-theme-primary line-clamp-2">{video.title}</h3>
                        <p className="text-xs text-theme-secondary">{video.channelTitle} · {formatMinutes(video.durationSeconds)}</p>
                      </div>
                    </label>
                  ))}
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
      {form.type === 'youtube' ? (
        <Field label="Transcript / subtitles">
          <div className="space-y-2">
            <textarea
              className="input-field min-h-32"
              value={form.transcriptText}
              onChange={(event) => setForm({ ...form, transcriptText: event.target.value })}
              placeholder="Fetch metadata to auto-load subtitles when available, or paste transcript text here."
            />
            <p className="text-xs text-theme-secondary">
              {form.transcriptText?.trim() ? `${form.transcriptText.trim().length.toLocaleString()} transcript characters ready to save.` : 'No transcript saved for this resource yet.'}
            </p>
          </div>
        </Field>
      ) : (
        <Field label="Description"><textarea className="input-field min-h-24" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
      )}
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
      <div className="grid grid-cols-2 gap-3">
        <ToggleRow label="Published" checked={form.published} onChange={(published) => setForm({ ...form, published })} />
        <ToggleRow label="Featured" checked={form.featured} onChange={(featured) => setForm({ ...form, featured })} />
      </div>
    </div>
  )
}

function ResourceRow({ resource, index, total, onMove, onEdit, onDelete }) {
  const transcriptLength = resource.transcriptLength ?? resource.transcriptText?.trim().length ?? 0
  const hasTranscript = Boolean(resource.hasTranscript || transcriptLength)

  return (
    <div className="border border-theme-border rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0 overflow-hidden">
      <div className="flex gap-3 min-w-0 flex-1">
        {resource.thumbnailUrl ? <img src={resource.thumbnailUrl} alt="" className="w-24 h-14 rounded-lg object-cover bg-theme-bg shrink-0" /> : <div className="w-14 h-14 rounded-xl bg-theme-bg flex items-center justify-center shrink-0"><i className="fas fa-file-lines text-theme-secondary" /></div>}
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 mb-1">
            <span className="px-2 py-1 rounded-lg bg-theme-bg text-xs font-bold text-theme-secondary">{typeLabels[resource.type] || resource.type}</span>
            <StatusPill active={resource.published} activeLabel="Published" inactiveLabel="Draft" />
            {resource.featured ? <span className="px-2 py-1 rounded-lg bg-theme-success-bg text-xs font-bold text-theme-success-text">Featured</span> : null}
            {hasTranscript ? <span className="px-2 py-1 rounded-lg bg-theme-accent/10 text-xs font-bold text-theme-accent">Transcript</span> : null}
          </div>
          <h3 className="font-bold text-theme-primary truncate max-w-full">{resource.title}</h3>
          <p className="text-xs text-theme-secondary truncate">
            {resource.categoryId?.name || 'No category'} · {resource.level} · {resource.language}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end shrink-0">
        <IconButton title="Move up" icon="fa-arrow-up" disabled={index === 0} onClick={() => onMove(-1)} />
        <IconButton title="Move down" icon="fa-arrow-down" disabled={index === total - 1} onClick={() => onMove(1)} />
        <IconButton title="Edit" icon="fa-pen" onClick={onEdit} />
        <IconButton title="Delete" icon="fa-trash" danger onClick={onDelete} />
      </div>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <section className="bg-theme-surface border border-theme-border rounded-2xl p-5 shadow-sm min-w-0">
      <h3 className="text-lg font-extrabold text-theme-primary mb-4">{title}</h3>
      {children}
    </section>
  )
}

function Field({ label, children }) {
  return <label className="block"><span className="block text-sm font-bold text-theme-primary mb-1">{label}</span>{children}</label>
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
  return (
    <div className="grid grid-cols-5 gap-2">
      {categoryColors.map((color) => (
        <button
          key={color}
          type="button"
          title={color}
          onClick={() => onChange(color)}
          className={`h-11 rounded-xl border transition-all ${value === color ? 'border-theme-primary ring-2' : 'border-theme-border'}`}
          style={{ backgroundColor: color, '--tw-ring-color': 'var(--color-accent)' }}
        >
          <span className="sr-only">{color}</span>
        </button>
      ))}
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

function resourceFormToPayload(form) {
  return {
    categoryId: form.categoryId,
    type: form.type,
    title: form.title,
    description: form.type === 'youtube' ? '' : form.description || '',
    transcriptText: form.type === 'youtube' ? form.transcriptText || '' : '',
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
    published: form.published,
    featured: form.featured,
    transcriptText: data.transcriptText || form.transcriptText,
    level: form.level,
    language: form.language,
    tagsInput: form.tagsInput,
    topicTagsInput: form.topicTagsInput,
  }
}

function mapYouTubeToForm(video) {
  return {
    type: 'youtube',
    title: video.title || '',
    description: '',
    transcriptText: video.transcriptText || '',
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
