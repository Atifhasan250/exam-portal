import { buildPageMetadata } from '@/lib/site'
import QuizPageClient from './QuizPageClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { slug } = await params
  return {
    ...buildPageMetadata({
    title: 'Resource Quiz',
    description: 'Take a timed quiz for this learning resource on IT Resource Zone.',
    path: `/quiz/${slug}`,
    }),
    robots: { index: false, follow: false },
  }
}

export default async function ResourceQuizPage({ params }) {
  const { slug } = await params
  return <QuizPageClient params={Promise.resolve({ slug })} />
}
