import HomePageClient from './HomePageClient'
import { buildPageMetadata } from '@/lib/site'

export const dynamic = 'force-dynamic'

export const metadata = buildPageMetadata({
  title: 'IT Resource Zone',
  description:
    'Take live IT exams, practice past questions, review instant results, track daily habits, monitor progress, and use curated learning resources in one student-focused portal.',
  keywords: [
    'IT exam portal',
    'online IT exams',
    'student progress tracker',
    'habit tracker for students',
    'IT learning resources',
    'online exam leaderboard',
  ],
})

export default function HomePage() {
  return (
    <>
      <HomePageClient />
    </>
  )
}
