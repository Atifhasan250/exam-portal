import ExamsPageClient from './ExamsPageClient'
import { buildPageMetadata } from '@/lib/site'

export const metadata = buildPageMetadata({
  title: 'Exams',
  description:
    'Browse upcoming, live, and past IT exams. Students can join timed live assessments or practice older exams with instant results and leaderboard support.',
  path: '/exams',
  keywords: ['live IT exams', 'practice exams', 'student assessment portal'],
})

export default function ExamsPage() {
  return <ExamsPageClient />
}
