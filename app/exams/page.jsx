import ExamsPageClient from './ExamsPageClient'
import { buildPageMetadata, getSiteUrl } from '@/lib/site'
import { connectDB } from '@/lib/db'
import Exam from '@/lib/models/Exam'

export const revalidate = 30

export const metadata = buildPageMetadata({
  title: 'Exams',
  description:
    'Browse upcoming, live, and past IT exams. Students can join timed live assessments or practice older exams with instant results and leaderboard support.',
  path: '/exams',
  keywords: ['live IT exams', 'practice exams', 'student assessment portal'],
})

export default async function ExamsPage() {
  const initialExams = await getInitialExams()
  const schemas = buildExamsSchemas(initialExams)

  return (
    <>
      {schemas.map((schema) => (
        <script
          key={schema['@type']}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <ExamsPageClient initialExams={initialExams} />
    </>
  )
}

async function getInitialExams() {
  try {
    await connectDB()
    const exams = await Exam.find({ published: true }, {
      _id: 1,
      title: 1,
      duration: 1,
      liveStart: 1,
      liveEnd: 1,
      published: 1,
      createdAt: 1,
      updatedAt: 1,
    }).sort({ createdAt: -1 }).lean()

    return JSON.parse(JSON.stringify(exams.map((exam) => ({
      _id: exam._id.toString(),
      title: exam.title,
      duration: exam.duration,
      liveStart: exam.liveStart || null,
      liveEnd: exam.liveEnd || null,
      published: Boolean(exam.published),
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
    }))))
  } catch {
    return []
  }
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
