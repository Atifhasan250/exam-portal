import ResourcesPageClient from './ResourcesPageClient'
import { buildPageMetadata } from '@/lib/site'

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

export default function ResourcesPage() {
  return <ResourcesPageClient />
}
