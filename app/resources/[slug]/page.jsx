import CategoryResourcesClient from './CategoryResourcesClient'
import { buildPageMetadata } from '@/lib/site'

export async function generateMetadata({ params }) {
  const { slug } = await params

  return {
    ...buildPageMetadata({
      title: 'Resource Category',
      description: 'Browse curated learning resources by category on IT Resource Zone.',
      path: `/resources/${slug}`,
      keywords: ['IT resources', 'learning category', slug],
    }),
    robots: { index: true, follow: true },
  }
}

export default async function CategoryResourcesPage({ params }) {
  const { slug } = await params
  return <CategoryResourcesClient slug={slug} />
}
