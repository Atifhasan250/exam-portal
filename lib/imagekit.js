import { createHmac, randomUUID } from 'crypto'

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
  const expire = Math.floor(Date.now() / 1000) + 30 * 60
  const signature = createHmac('sha1', privateKey).update(`${token}${expire}`).digest('hex')

  return { token, expire, signature, publicKey, urlEndpoint }
}
