import { createHmac, randomUUID } from 'crypto'

const IMAGEKIT_UPLOAD_ENDPOINT = 'https://upload.imagekit.io/api/v1/files/upload'
const IMAGEKIT_DELETE_ENDPOINT = 'https://api.imagekit.io/v1/files'
const IMAGEKIT_REQUEST_TIMEOUT_MS = positiveInt(process.env.IMAGEKIT_REQUEST_TIMEOUT_MS, 10000)

export function getImageKitPublicConfig() {
  return {
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '',
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '',
  }
}

export function getImageKitUploadAuth() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
  const { publicKey, urlEndpoint } = getImageKitPublicConfig()

  if (!privateKey || !publicKey || !urlEndpoint) {
    throw new Error('ImageKit environment variables are not fully configured')
  }

  const token = randomUUID()
  const expire = Math.floor(Date.now() / 1000) + 5 * 60
  const signature = createHmac('sha1', privateKey).update(`${token}${expire}`).digest('hex')

  return { token, expire, signature, publicKey, urlEndpoint }
}

export async function uploadImageKitFile({ file, fileName, folder, useUniqueFileName = true, tags = [] }) {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
  const { publicKey, urlEndpoint } = getImageKitPublicConfig()

  if (!privateKey || !publicKey || !urlEndpoint) {
    throw new Error('ImageKit environment variables are not fully configured')
  }

  const formData = new FormData()
  formData.set('file', file)
  formData.set('fileName', fileName)
  formData.set('folder', folder)
  formData.set('useUniqueFileName', String(useUniqueFileName))
  if (tags.length) formData.set('tags', tags.join(','))

  const response = await fetchWithImageKitTimeout(IMAGEKIT_UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`,
    },
    body: formData,
  }, 'ImageKit upload')
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || data.error || 'ImageKit upload failed')
  }

  return data
}

export async function deleteImageKitFile(fileId) {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
  const trimmedFileId = String(fileId || '').trim()

  if (!trimmedFileId) return false
  if (!privateKey) throw new Error('ImageKit private key is not configured')

  const response = await fetchWithImageKitTimeout(`${IMAGEKIT_DELETE_ENDPOINT}/${encodeURIComponent(trimmedFileId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`,
    },
  }, 'ImageKit delete')

  if (response.ok || response.status === 404) return true

  const data = await response.json().catch(() => ({}))
  throw new Error(data.message || data.error || 'ImageKit delete failed')
}

async function fetchWithImageKitTimeout(url, options, operation) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), IMAGEKIT_REQUEST_TIMEOUT_MS)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`${operation} timed out after ${IMAGEKIT_REQUEST_TIMEOUT_MS}ms`, { cause: error })
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

function positiveInt(value, fallback) {
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : fallback
}
