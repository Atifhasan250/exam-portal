import CategoryResourcesClient from './CategoryResourcesClient'
import { buildPageMetadata, getSiteUrl } from '@/lib/site'
import { publicResourceSlug } from '@/lib/resourceUtils'
import { notFound } from 'next/navigation'
import { getCachedCategoryBySlug, getCachedInitialCategoryPageData } from '@/lib/publicCache'

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
          dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
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

function safeJsonLd(schema) {
  return JSON.stringify(schema)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

async function getInitialCategoryPageData(slug) {
  try {
    return await getCachedInitialCategoryPageData(slug)
  } catch {
    return { category: null, categoryFound: true, categories: [], resources: [], hasMoreResources: false, initialDataReady: false }
  }
}

async function getCategoryBySlug(slug) {
  return getCachedCategoryBySlug(slug)
}

function buildCategorySchemas(category, resources) {
  const siteUrl = getSiteUrl()
  const categoryUrl = new URL(`/resources/${category.slug}`, siteUrl).toString()
  const itemListElement = resources
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

function resourcePath(resource) {
  return resource.type === 'youtube'
    ? `/resources/watch/${publicResourceSlug(resource)}`
    : `/resources/view/${publicResourceSlug(resource)}`
}
