import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { connectDB } from '@/lib/db'
import ResourceProgress from '@/lib/models/ResourceProgress'
import ResourceVideoPlayer from '@/components/resources/ResourceVideoPlayer'
import ResourceWatchTabs from '@/components/resources/ResourceWatchTabs'
import { buildPageMetadata, getSiteUrl } from '@/lib/site'
import { safeJsonLd } from '@/lib/jsonLd'
import { publicResourceSlug, serialize } from '@/lib/resourceUtils'
import { getCachedCategorySiblingResources, getCachedResourceBySlug } from '@/lib/publicCache'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const resource = await getResourceBySlug(slug)

  if (!resource) {
    return {
      ...buildPageMetadata({
        title: 'Resource Not Found',
        description: 'This learning resource could not be found.',
        path: `/resources/watch/${slug}`,
      }),
      robots: { index: false, follow: true },
    }
  }

  const description = resource.description?.trim()
    || excerpt(resource.transcriptText, 155)
    || `Watch ${resource.title} on IT Resource Zone.`

  return {
    ...buildPageMetadata({
      title: resource.title,
      description,
      path: `/resources/watch/${publicResourceSlug(resource)}`,
      keywords: ['IT learning video', resource.categoryId?.name, resource.channelTitle].filter(Boolean),
      image: resource.thumbnailUrl || '/link-preview.jpg',
      imageAlt: resource.title,
    }),
    robots: { index: false, follow: false },
  }
}

export default async function ResourceWatchPage({ params }) {
  const { slug } = await params
  const resource = await getResourceBySlug(slug)
  if (!resource || resource.type !== 'youtube') notFound()
  const { previousResource, nextResource, resourceNumber, resourceTotal } = await getSiblingResources(resource)
  const playerResource = serialize(resource)
  playerResource.slug = publicResourceSlug(resource)
  playerResource.quizQuestionCount = Array.isArray(resource.quizQuestions) ? resource.quizQuestions.length : 0
  playerResource.resourceNumber = resourceNumber
  playerResource.resourceTotal = resourceTotal
  delete playerResource.quizQuestions
  delete playerResource.transcriptText
  const videoSchema = buildVideoSchema(resource)
  const breadcrumbSchema = buildBreadcrumbSchema(resource)

  const { userId } = await auth()
  if (userId) await connectDB()
  const progress = userId
    ? await ResourceProgress.findOne({ clerkUserId: userId, resourceId: resource._id }).lean()
    : null

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary page-enter">
      {[videoSchema, breadcrumbSchema].filter(Boolean).map((schema) => (
        <script
          key={schema['@type']}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
        />
      ))}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12 pb-28 space-y-6">
        <div className="flex items-center space-x-3">
          <Link
            href={resource.categoryId?.slug ? `/resources/${resource.categoryId.slug}` : '/resources'}
            aria-label={`Back to ${resource.categoryId?.name || 'resources'}`}
            className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all shrink-0"
          >
            <i className="fas fa-arrow-left" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-extrabold text-theme-primary">{resource.categoryId?.name || 'Resources'}</h1>
        </div>

        <section className="grid lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
          <div className="space-y-5 min-w-0">
            <ResourceVideoPlayer
              resource={playerResource}
              initialProgress={serialize(progress)}
              previousResource={previousResource}
              nextResource={nextResource}
            />
          </div>

          <ResourceWatchTabs resource={playerResource} />
        </section>
      </main>
    </div>
  )
}

const getResourceBySlug = getCachedResourceBySlug
const getSiblingResources = getCachedCategorySiblingResources

function excerpt(value, maxLength = 160) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}...`
}

function buildVideoSchema(resource) {
  if (!resource?.thumbnailUrl || !resource?.title) return null

  const siteUrl = getSiteUrl()
  const watchUrl = new URL(`/resources/watch/${publicResourceSlug(resource)}`, siteUrl).toString()
  const uploadDate = resource.sourcePublishedAt || resource.createdAt || resource.updatedAt
  const description = resource.description?.trim()
    || excerpt(resource.transcriptText, 500)
    || `Watch ${resource.title} on IT Resource Zone.`

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: resource.title,
    description,
    thumbnailUrl: [new URL(resource.thumbnailUrl, siteUrl).toString()],
    uploadDate: uploadDate ? new Date(uploadDate).toISOString() : new Date().toISOString(),
    embedUrl: resource.youtubeId ? `https://www.youtube.com/embed/${resource.youtubeId}` : undefined,
    url: watchUrl,
    duration: toIsoDuration(resource.durationSeconds),
    inLanguage: schemaLanguage(resource.language),
    isAccessibleForFree: true,
    publisher: {
      '@type': 'Organization',
      name: 'IT Resource Zone',
      logo: {
        '@type': 'ImageObject',
        url: new URL('/favicon.png', siteUrl).toString(),
      },
    },
  }

  return Object.fromEntries(Object.entries(schema).filter(([, value]) => value !== undefined && value !== ''))
}

function buildBreadcrumbSchema(resource) {
  const siteUrl = getSiteUrl()
  const categorySlug = resource.categoryId?.slug
  const categoryName = resource.categoryId?.name || 'Resources'

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Resources',
        item: new URL('/resources', siteUrl).toString(),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: categoryName,
        item: new URL(categorySlug ? `/resources/${categorySlug}` : '/resources', siteUrl).toString(),
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: resource.title,
        item: new URL(`/resources/watch/${publicResourceSlug(resource)}`, siteUrl).toString(),
      },
    ],
  }
}

function toIsoDuration(seconds = 0) {
  const total = Math.max(0, Number(seconds) || 0)
  if (!total) return ''
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const remainingSeconds = total % 60
  return `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}${remainingSeconds ? `${remainingSeconds}S` : ''}`
}

function schemaLanguage(language) {
  if (language === 'bn') return 'bn'
  if (language === 'en') return 'en'
  if (language === 'hi') return 'hi'
  return undefined
}
