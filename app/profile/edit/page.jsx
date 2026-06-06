'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import PageSkeleton from '@/components/PageSkeleton'
import AuthCallout from '@/components/AuthCallout'

const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024
const ALLOWED_PROFILE_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export default function ProfileEditPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [previewUrl, setPreviewUrl] = useState('')
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const email = user?.primaryEmailAddress?.emailAddress || 'No primary email'
  const customProfileImageUrl = user?.publicMetadata?.profileImageUrl || ''
  const fallbackProfileImageUrl = user?.imageUrl || ''
  const visibleProfileImageUrl = removeImage ? fallbackProfileImageUrl : (customProfileImageUrl || fallbackProfileImageUrl)

  useEffect(() => {
    if (!user) return
    setName(user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || '')
    setCategory(getInitialCategory(user.publicMetadata))
    setRemoveImage(false)
  }, [user])

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl('')
      return undefined
    }

    const objectUrl = URL.createObjectURL(imageFile)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [imageFile])

  if (!isLoaded) return <PageSkeleton />

  if (!user) {
    return (
      <div className="bg-theme-bg min-h-screen py-20 px-4">
        <div className="max-w-4xl mx-auto mt-10">
          <AuthCallout title="Login first to edit your profile" description="Your profile settings are linked to your authenticated IT Resource Zone account." />
        </div>
      </div>
    )
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    setError('')

    if (!file) {
      setImageFile(null)
      return
    }

    if (!ALLOWED_PROFILE_IMAGE_TYPES.has(file.type)) {
      setImageFile(null)
      setError('Upload a JPG, PNG, WebP, or GIF image.')
      return
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      setImageFile(null)
      setError('Profile image must be 2 MB or smaller.')
      return
    }

    setImageFile(file)
    setRemoveImage(false)
  }

  const deleteSelectedImage = () => {
    setImageFile(null)
    setFileInputKey((current) => current + 1)
    setRemoveImage(Boolean(customProfileImageUrl))
    setError('')
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('Name is required.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.set('name', trimmedName)
      formData.set('category', normalizeCategory(category))
      if (removeImage) formData.set('removeImage', 'true')
      if (imageFile) formData.set('image', imageFile)

      const response = await fetch('/api/profile', {
        method: 'PUT',
        body: formData,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not update profile.')

      await user.reload?.()
      router.refresh()
      setSuccess('Profile updated.')
      setTimeout(() => router.push('/profile'), 500)
    } catch (saveError) {
      setError(saveError.message || 'Could not update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme pb-24 page-enter">
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Edit Profile</h1>
            <p className="text-theme-secondary mt-1">Update your public profile details.</p>
          </div>
          <Link href="/profile" className="px-4 py-3 rounded-xl bg-theme-surface border border-theme-border font-bold text-sm inline-flex items-center justify-center gap-2">
            <i className="fas fa-arrow-left" />
            Back to Profile
          </Link>
        </header>

        <form onSubmit={saveProfile} className="bg-theme-surface border border-theme-border rounded-2xl p-5 sm:p-6 space-y-6">
          {error ? <div className="p-3 bg-theme-error-bg text-theme-error-text rounded-xl text-sm font-semibold">{error}</div> : null}
          {success ? <div className="p-3 bg-theme-success-bg text-theme-success-text rounded-xl text-sm font-semibold">{success}</div> : null}

          <section className="flex flex-col sm:flex-row gap-5">
            <div className="w-28 h-28 rounded-full bg-theme-accent/10 border border-theme-accent/20 overflow-hidden flex items-center justify-center shrink-0">
              {previewUrl ? (
                <img src={previewUrl} alt="Profile preview" className="w-full h-full object-cover" />
              ) : visibleProfileImageUrl ? (
                <Image src={visibleProfileImageUrl} alt="Profile preview" width={112} height={112} className="w-full h-full object-cover" />
              ) : (
                <i className="fas fa-user text-4xl text-theme-accent" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <label className="block text-sm font-bold text-theme-primary" htmlFor="profileImage">Profile Image</label>
              <input
                key={fileInputKey}
                id="profileImage"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
                className="input-field"
              />
              {(imageFile || customProfileImageUrl) ? (
                <button
                  type="button"
                  onClick={deleteSelectedImage}
                  className="px-4 py-2 rounded-xl bg-theme-error-bg text-theme-error-text border border-theme-error-border font-bold text-sm inline-flex items-center justify-center gap-2"
                >
                  <i className="fas fa-trash" />
                  Delete Image
                </button>
              ) : null}
              {removeImage ? (
                <p className="text-xs font-semibold text-theme-secondary">
                  Custom image will be removed after saving. Your Gmail image or the default profile icon will be shown instead.
                </p>
              ) : null}
              <p className="text-xs text-theme-secondary leading-relaxed">
                Upload a JPG, PNG, WebP, or GIF image up to 2 MB. When you save a new image, the previous ImageKit file is deleted to avoid extra storage use.
              </p>
            </div>
          </section>

          <Field label="Name" htmlFor="name">
            <input
              id="name"
              className="input-field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder="Your full name"
            />
          </Field>

          <Field label="Email" htmlFor="email">
            <input
              id="email"
              className="input-field opacity-70 cursor-not-allowed"
              value={email}
              disabled
              readOnly
            />
            <p className="text-xs text-theme-secondary mt-2">Email is linked to your sign-in account and cannot be edited here.</p>
          </Field>

          <Field label="Category" htmlFor="category">
            <input
              id="category"
              className="input-field"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              maxLength={40}
              placeholder="Python"
            />
            <p className="text-xs text-theme-secondary mt-2">Write one category only, like Python, Cyber Security, or Networking.</p>
            {normalizeCategory(category) ? (
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-3 py-1 rounded-full bg-theme-accent/10 text-theme-accent text-xs font-bold border border-theme-accent">
                  {normalizeCategory(category)}
                </span>
              </div>
            ) : null}
          </Field>

          <div className="flex flex-col sm:flex-row gap-3">
            <button type="submit" disabled={saving} className="px-5 py-3 rounded-xl bg-theme-accent text-theme-accent-text font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2">
              <i className={`fas ${saving ? 'fa-circle-notch fa-spin' : 'fa-save'}`} />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <Link href="/profile" className="px-5 py-3 rounded-xl bg-theme-bg border border-theme-border font-bold inline-flex items-center justify-center">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label className="block text-sm font-bold text-theme-primary mb-2" htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  )
}

function normalizeCategory(value) {
  return String(value || '')
    .split(',')[0]
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 40)
}

function getInitialCategory(metadata = {}) {
  if (typeof metadata.category === 'string') return metadata.category
  return Array.isArray(metadata.categories) ? metadata.categories[0] || '' : ''
}
