import { buildPageMetadata, getSiteUrl } from '@/lib/site'
import { isValidObjectId } from '@/lib/routeParams'
import ExamPageClient from './ExamPageClient'
import { notFound } from 'next/navigation'
import { getCachedPublicExamDetail, publicExamSummary } from '@/lib/publicCache'

export const revalidate = 60

export async function generateMetadata({ params }) {
  const { id } = await params
  if (!isValidObjectId(id)) {
    return buildPageMetadata({
      title: 'Exam Not Found',
      description: 'The requested exam could not be found.',
      path: `/exam/${id}`,
    })
  }

  try {
    const exam = await getPublicExamSummary(id)

    if (!exam) {
      return buildPageMetadata({
        title: 'Exam Not Found',
        description: 'The requested exam could not be found.',
        path: `/exam/${id}`,
      })
    }

    return buildPageMetadata({
      title: exam.title,
      description: `Join ${exam.title} on IT Resource Zone. Timed exam access with instant scoring, practice review, and student-focused assessment flow.`,
      path: `/exam/${id}`,
      keywords: ['online exam', 'IT exam', exam.title],
    })
  } catch {
    return buildPageMetadata({
      title: 'Exam',
      description: 'Take a timed IT exam on IT Resource Zone.',
      path: `/exam/${id}`,
    })
  }
}

export default function ExamPage(props) {
  return <ExamPageWithData {...props} />
}

async function ExamPageWithData({ params }) {
  const { id } = await params
  const initialExam = isValidObjectId(id) ? await getPublicExamSummary(id) : null

  if (!initialExam) notFound()

  const schemas = buildExamSchemas(initialExam)

  return (
    <>
      {schemas.map((schema) => (
        <script
          key={schema['@type']}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <ExamPageClient params={Promise.resolve({ id })} initialExam={initialExam} />
    </>
  )
}

async function getPublicExamSummary(id) {
  const exam = await getCachedPublicExamDetail(id)
  return publicExamSummary(exam)
}

function buildExamSchemas(exam) {
  const siteUrl = getSiteUrl()
  const examUrl = new URL(`/exam/${exam._id}`, siteUrl).toString()

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
          item: new URL('/exams', siteUrl).toString(),
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: exam.title,
          item: examUrl,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name: exam.title,
      description: `Timed IT exam with ${exam.questionCount || 0} questions, instant scoring, review, and leaderboard support on IT Resource Zone.`,
      url: examUrl,
      learningResourceType: 'Practice exam',
      educationalLevel: 'Beginner',
      timeRequired: exam.duration ? `PT${exam.duration}M` : undefined,
      isAccessibleForFree: true,
      provider: {
        '@type': 'Organization',
        name: 'IT Resource Zone',
        url: siteUrl,
      },
    },
  ].map((schema) => Object.fromEntries(Object.entries(schema).filter(([, value]) => value !== undefined)))
}
