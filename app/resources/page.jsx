import ResourcesPageClient from './ResourcesPageClient'
import { buildPageMetadata, getSiteUrl } from '@/lib/site'
import { publicResourceSlug } from '@/lib/resourceUtils'
import { getCachedInitialResourcePageData } from '@/lib/publicCache'

export const revalidate = 60

export const metadata = {
  ...buildPageMetadata({
    title: 'Resources',
    description:
      'Explore curated free learning materials, exam preparation resources, and the future premium content library for beginner IT students.',
    path: '/resources',
    keywords: ['IT learning resources', 'student resource hub', 'exam preparation materials'],
  }),
  robots: { index: true, follow: true },
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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
    .filter((resource) => resource.type === 'youtube')
    .slice(0, 50)
    .map((resource, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: resource.title,
      url: new URL(`/resources/watch/${publicResourceSlug(resource)}`, siteUrl).toString(),
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
