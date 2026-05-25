import ExamsPageClient from './ExamsPageClient'
import { buildPageMetadata, getSiteUrl } from '@/lib/site'
import { getCachedPublishedExamPage } from '@/lib/publicCache'
import { safeJsonLd } from '@/lib/jsonLd'

export const revalidate = 30
const EXAM_PAGE_SIZE = 12

export const metadata = buildPageMetadata({
  title: 'Exams',
  description:
    'Browse upcoming, live, and past IT exams. Students can join timed live assessments or practice older exams with instant results and leaderboard support.',
  path: '/exams',
  keywords: ['live IT exams', 'practice exams', 'student assessment portal'],
})

export default async function ExamsPage() {
  const initialExamPages = await getInitialExamPages()
  const schemas = buildExamsSchemas(flattenExamPages(initialExamPages))

  return (
    <>
      {schemas.map((schema) => (
        <script
          key={schema['@type']}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
        />
      ))}
      <ExamsPageClient initialExamPages={initialExamPages} />
    </>
  )
}

async function getInitialExamPages() {
  try {
    const [live, upcoming, past] = await Promise.all([
      getCachedPublishedExamPage({ status: 'live', limit: EXAM_PAGE_SIZE, offset: 0 }),
      getCachedPublishedExamPage({ status: 'upcoming', limit: EXAM_PAGE_SIZE, offset: 0 }),
      getCachedPublishedExamPage({ status: 'past', limit: EXAM_PAGE_SIZE, offset: 0 }),
    ])

    return { live, upcoming, past }
  } catch (err) {
    console.error('Failed to load initial exams', err)
    return {
      live: emptyExamPage('live'),
      upcoming: emptyExamPage('upcoming'),
      past: emptyExamPage('past'),
    }
  }
}

function emptyExamPage(status) {
  return { status, exams: [], totalCount: 0, limit: EXAM_PAGE_SIZE, offset: 0, nextOffset: 0, hasMore: false }
}

function flattenExamPages(pages) {
  const seen = new Set()
  return ['live', 'upcoming', 'past'].flatMap((status) => pages?.[status]?.exams || [])
    .filter((exam) => {
      if (!exam?._id || seen.has(exam._id)) return false
      seen.add(exam._id)
      return true
    })
}

function buildExamsSchemas(exams) {
  const siteUrl = getSiteUrl()
  const examsUrl = new URL('/exams', siteUrl).toString()

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
          name: 'Exams',
          item: examsUrl,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'IT Resource Zone Exams',
      description: 'Published IT practice exams, live exams, and past exam practice links.',
      url: examsUrl,
      numberOfItems: exams.length,
      itemListElement: exams.slice(0, 50).map((exam, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: exam.title,
        url: new URL(`/exam/${exam._id}`, siteUrl).toString(),
      })),
    },
  ]
}
