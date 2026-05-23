import ResourcesPageClient from './ResourcesPageClient'
import { connectDB } from '@/lib/db'
import Resource from '@/lib/models/Resource'
import ResourceCategory from '@/lib/models/ResourceCategory'
import { buildPageMetadata, getSiteUrl } from '@/lib/site'
import { publicResourceSlug, serialize, toPublicResources } from '@/lib/resourceUtils'

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
    await connectDB()

    const [categories, resources, totalCount] = await Promise.all([
      getPublishedCategoriesWithCounts(),
      Resource.find({ published: true })
        .populate('categoryId', 'name slug icon color')
        .sort({ order: 1, createdAt: -1 })
        .limit(80)
        .lean(),
      Resource.countDocuments({ published: true }),
    ])

    return {
      categories,
      resources: serialize(toPublicResources(resources)),
      hasMoreResources: resources.length < totalCount,
      initialDataReady: true,
    }
  } catch {
    return { categories: [], resources: [], hasMoreResources: false, initialDataReady: false }
  }
}

async function getPublishedCategoriesWithCounts() {
  const categories = await ResourceCategory.find({ published: true })
    .sort({ order: 1, name: 1 })
    .lean()

  const counts = await Resource.aggregate([
    { $match: { published: true, categoryId: { $in: categories.map((category) => category._id) } } },
    { $group: { _id: { categoryId: '$categoryId', type: '$type' }, count: { $sum: 1 } } },
  ])

  const countMap = new Map()
  for (const item of counts) {
    const key = item._id.categoryId.toString()
    const current = countMap.get(key) || { total: 0, youtube: 0, pdf: 0, link: 0, image: 0, file: 0 }
    current[item._id.type] = item.count
    current.total += item.count
    countMap.set(key, current)
  }

  return serialize(categories.map((category) => ({
    ...category,
    resourceCounts: countMap.get(category._id.toString()) || { total: 0, youtube: 0, pdf: 0, link: 0, image: 0, file: 0 },
  })))
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
