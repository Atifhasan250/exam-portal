import CategoryResourcesClient from './CategoryResourcesClient'
import { connectDB } from '@/lib/db'
import Resource from '@/lib/models/Resource'
import ResourceCategory from '@/lib/models/ResourceCategory'
import { buildPageMetadata, getSiteUrl } from '@/lib/site'
import { publicResourceSlug, serialize, toPublicResources } from '@/lib/resourceUtils'
import { notFound } from 'next/navigation'

export const revalidate = 60

export async function generateMetadata({ params }) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)

  if (category === null) {
    return {
      ...buildPageMetadata({
        title: 'Resource Category Not Found',
        description: 'This resource category could not be found.',
        path: `/resources/${slug}`,
        keywords: ['IT resources', 'learning category', slug],
      }),
      robots: { index: false, follow: false },
    }
  }

  if (category === undefined) {
    return {
      ...buildPageMetadata({
        title: 'Resource Category',
        description: 'Browse curated learning resources by category on IT Resource Zone.',
        path: `/resources/${slug}`,
        keywords: ['IT resources', 'learning category', slug],
      }),
      robots: { index: false, follow: true },
    }
  }

  const description = category.description?.trim()
    || `Browse ${category.name} learning resources, videos, PDFs, links, and files on IT Resource Zone.`

  return {
    ...buildPageMetadata({
      title: `${category.name} Resources`,
      description,
      path: `/resources/${slug}`,
      keywords: ['IT resources', `${category.name} resources`, category.name, slug],
    }),
    robots: { index: true, follow: true },
  }
}

export default async function CategoryResourcesPage({ params }) {
  const { slug } = await params
  const { category, categoryFound, categories, resources, hasMoreResources, initialDataReady } = await getInitialCategoryPageData(slug)

  if (categoryFound === false) notFound()

  const schemas = category ? buildCategorySchemas(category, resources) : []

  return (
    <>
      {schemas.map((schema) => (
        <script
          key={schema['@type']}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <CategoryResourcesClient
        slug={slug}
        initialCategories={categories}
        initialResources={resources}
        initialHasMoreResources={hasMoreResources}
        initialDataReady={initialDataReady}
      />
    </>
  )
}

async function getInitialCategoryPageData(slug) {
  try {
    await connectDB()

    const category = await ResourceCategory.findOne({ slug, published: true }).lean()
    if (!category) return { category: null, categoryFound: false, categories: [], resources: [], hasMoreResources: false, initialDataReady: true }

    const [categories, resources, totalCount] = await Promise.all([
      getPublishedCategoriesWithCounts(),
      Resource.find({ published: true, categoryId: category._id })
        .populate('categoryId', 'name slug icon color')
        .sort({ order: 1, createdAt: -1 })
        .limit(100)
        .lean(),
      Resource.countDocuments({ published: true, categoryId: category._id }),
    ])

    return {
      category: serialize(category),
      categoryFound: true,
      categories,
      resources: serialize(toPublicResources(resources)),
      hasMoreResources: resources.length < totalCount,
      initialDataReady: true,
    }
  } catch {
    return { category: null, categoryFound: true, categories: [], resources: [], hasMoreResources: false, initialDataReady: false }
  }
}

async function getCategoryBySlug(slug) {
  try {
    await connectDB()
    return await ResourceCategory.findOne({ slug, published: true }).lean() || null
  } catch {
    return undefined
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

function buildCategorySchemas(category, resources) {
  const siteUrl = getSiteUrl()
  const categoryUrl = new URL(`/resources/${category.slug}`, siteUrl).toString()
  const itemListElement = resources
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
          item: new URL('/resources', siteUrl).toString(),
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: category.name,
          item: categoryUrl,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${category.name} Resources`,
      description: category.description || `Curated ${category.name} learning resources on IT Resource Zone.`,
      url: categoryUrl,
      numberOfItems: itemListElement.length,
      itemListElement,
    },
  ]
}
