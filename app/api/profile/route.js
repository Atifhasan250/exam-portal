import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { userMutationRateLimit } from '@/lib/rateLimit'
import { deleteImageKitFile, uploadImageKitFile } from '@/lib/imagekit'

const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024
const ALLOWED_PROFILE_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export async function PUT(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  let uploadedFileId = ''

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await userMutationRateLimit(request, {
      name: 'profile-update',
      windowMs: 60 * 1000,
      max: 12,
      keyParts: [userId],
      message: 'Too many profile updates. Try again shortly.',
    })
    if (limited) return limited

    const formData = await request.formData()
    const displayName = String(formData.get('name') || '').trim()
    const category = normalizeCategory(formData.get('category') || formData.get('categories'))
    const categories = category ? [category] : []
    const image = formData.get('image')
    const removeImage = String(formData.get('removeImage') || '') === 'true'

    if (!displayName) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }
    if (displayName.length > 120) {
      return NextResponse.json({ error: 'Name must be 120 characters or fewer.' }, { status: 400 })
    }

    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const previousPrivateMetadata = user.privateMetadata || {}
    const previousPublicMetadata = user.publicMetadata || {}

    let profileImageUrl = String(previousPublicMetadata.profileImageUrl || '')
    let profileImageFileId = String(previousPrivateMetadata.profileImageFileId || '')

    if (removeImage) {
      profileImageUrl = ''
      profileImageFileId = ''
    }

    if (isUploadedFile(image)) {
      const validationError = validateProfileImage(image)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }

      const uploadResult = await uploadImageKitFile({
        file: image,
        fileName: buildProfileImageName(userId, image.name),
        folder: `/profile-images/${userId}`,
        useUniqueFileName: true,
        tags: ['profile-image', userId],
      })

      uploadedFileId = uploadResult.fileId || ''
      profileImageUrl = uploadResult.url || ''
      profileImageFileId = uploadedFileId
    }

    const { firstName, lastName } = splitName(displayName)
    await client.users.updateUser(userId, {
      firstName,
      lastName,
      publicMetadata: {
        ...previousPublicMetadata,
        profileImageUrl,
        category,
        categories,
      },
      privateMetadata: {
        ...previousPrivateMetadata,
        profileImageFileId,
      },
    })

    const oldFileId = String(previousPrivateMetadata.profileImageFileId || '')
    if ((uploadedFileId || removeImage) && oldFileId && oldFileId !== uploadedFileId) {
      try {
        await deleteImageKitFile(oldFileId)
      } catch (error) {
        logger.error('[PUT /api/profile] failed to delete previous profile image', { error, userId })
      }
    }

    return NextResponse.json({
      success: true,
      profile: {
        firstName,
        lastName,
        name: [firstName, lastName].filter(Boolean).join(' '),
        email: user.primaryEmailAddress?.emailAddress || '',
        imageUrl: profileImageUrl,
        categories,
      },
    })
  } catch (error) {
    if (uploadedFileId) {
      try {
        await deleteImageKitFile(uploadedFileId)
      } catch (deleteError) {
        logger.error('[PUT /api/profile] failed to clean uploaded profile image after error', { error: deleteError })
      }
    }
    logger.error('[PUT /api/profile]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

function isUploadedFile(value) {
  return value && typeof value === 'object' && typeof value.arrayBuffer === 'function' && value.size > 0
}

function validateProfileImage(file) {
  if (!ALLOWED_PROFILE_IMAGE_TYPES.has(file.type)) {
    return 'Upload a JPG, PNG, WebP, or GIF image.'
  }
  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    return 'Profile image must be 2 MB or smaller.'
  }
  return ''
}

function normalizeCategory(value) {
  return String(value || '')
    .split(',')[0]
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 40)
}

function splitName(value) {
  const parts = value.trim().split(/\s+/)
  return {
    firstName: parts.shift() || '',
    lastName: parts.join(' '),
  }
}

function buildProfileImageName(userId, fileName) {
  const extension = String(fileName || '').split('.').pop()?.toLowerCase()
  const safeExtension = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension) ? extension : 'jpg'
  return `${userId}-profile.${safeExtension}`
}
