const DEFAULT_SITE_URL = 'https://it-resource-zone.vercel.app'

export function getSiteUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (explicitUrl) return explicitUrl

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (productionUrl) return `https://${productionUrl}`

  const previewUrl = process.env.VERCEL_URL
  if (previewUrl) return `https://${previewUrl}`

  return DEFAULT_SITE_URL
}

export function buildPageMetadata({
  title,
  description,
  path = '/',
  keywords,
}) {
  const siteUrl = getSiteUrl()
  const url = new URL(path, siteUrl).toString()
  const fullTitle = title ? `${title} | IT Resource Zone` : 'IT Resource Zone'
  const image = '/link-preview.jpg'

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: 'IT Resource Zone',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
    },
  }
}
