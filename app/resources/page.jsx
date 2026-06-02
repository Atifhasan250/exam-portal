import ResourcesPageClient from './ResourcesPageClient'
import { buildPageMetadata, getSiteUrl } from '@/lib/site'
import { publicResourceSlug } from '@/lib/resourceUtils'
import { getCachedInitialResourcePageData } from '@/lib/publicCache'
import { safeJsonLd } from '@/lib/jsonLd'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export const metadata = {
  ...buildPageMetadata({
    title: 'Resources',
    description:
      'Open the signed-in IT Resource Zone resource library with curated YouTube lessons, PDFs, images, files, and useful links for beginner IT students.',
    path: '/resources',
    keywords: ['IT learning resources', 'student resource hub', 'exam preparation materials'],
  }),
  robots: { index: false, follow: false },
}

export default async function ResourcesPage() {
  const { categories, resources, hasMoreResources, initialDataReady } = await getInitialResourcePageData()
  const schemas = buildResourcesSchemas(categories, resources)

  return (
    <>
      {schemas.map((schema) => (
        <script
          key={schema['@type']}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
        />
      ))}
      <ResourcesPageClient
        initialCategories={categories}
        initialResources={resources}
        initialHasMoreResources={hasMoreResources}
        initialDataReady={initialDataReady}
      />
    </>
  )
}

async function getInitialResourcePageData() {
  try {
    return await getCachedInitialResourcePageData()
  } catch {
    return { categories: [], resources: [], hasMoreResources: false, initialDataReady: false }
  }
}

function buildResourcesSchemas(categories, resources) {
  const siteUrl = getSiteUrl()
  const resourcesUrl = new URL('/resources', siteUrl).toString()
  const categoryItems = categories.slice(0, 50).map((category, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: category.name,
    url: new URL(`/resources/${category.slug}`, siteUrl).toString(),
  }))
  const resourceItems = resources
    .slice(0, 50)
    .map((resource, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: resource.title,
      url: new URL(resourcePath(resource), siteUrl).toString(),
    }))

  return [
    {
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
          item: resourcesUrl,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'IT Resource Zone Resources',
      description: 'Curated IT learning resources, videos, PDFs, links, and exam preparation materials.',
      url: resourcesUrl,
      hasPart: categoryItems,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: resourceItems.length,
        itemListElement: resourceItems,
      },
    },
  ]
}

function resourcePath(resource) {
  return resource.type === 'youtube'
    ? `/resources/watch/${publicResourceSlug(resource)}`
    : `/resources/view/${publicResourceSlug(resource)}`
}
