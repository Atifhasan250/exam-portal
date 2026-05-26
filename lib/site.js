const PRIMARY_SITE_URL = 'https://irz.atifhasan.com'
const LEGACY_SITE_URL = 'https://it-resource-zone.vercel.app'

function normalizeSiteUrl(url) {
  return url?.replace(/\/+$/, '')
}

export function getSiteUrl() {
  const explicitSiteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)

  if (explicitSiteUrl && explicitSiteUrl !== LEGACY_SITE_URL) return explicitSiteUrl

  if (process.env.NODE_ENV === 'production') return PRIMARY_SITE_URL

  const explicitBaseUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_BASE_URL)
  if (explicitBaseUrl && explicitBaseUrl !== LEGACY_SITE_URL) return explicitBaseUrl

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (productionUrl) return `https://${productionUrl}`

  const previewUrl = process.env.VERCEL_URL
  if (previewUrl) return `https://${previewUrl}`

  return PRIMARY_SITE_URL
}

export function buildPageMetadata({
  title,
  description,
  path = '/',
  keywords,
  image = '/link-preview.jpg',
  imageAlt,
}) {
  const siteUrl = getSiteUrl()
  const url = new URL(path, siteUrl).toString()
  const isHomeTitle = title === 'IT Resource Zone'
  const metadataTitle = isHomeTitle ? { absolute: 'IT Resource Zone' } : title
  const fullTitle = title && !isHomeTitle ? `${title} | IT Resource Zone` : 'IT Resource Zone'
  const imageUrl = new URL(image || '/link-preview.jpg', siteUrl).toString()

  return {
    title: metadataTitle,
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
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt || fullTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
    },
  }
}
