import HomePageClient from './HomePageClient'
import HomeRecentExams from './HomeRecentExams'
import { buildPageMetadata } from '@/lib/site'

export const metadata = buildPageMetadata({
  title: 'IT Resource Zone',
  description:
    'Take live IT exams, practice past questions, track daily habits, monitor monthly progress, and organize learning resources in one student-focused portal.',
  keywords: [
    'IT exam portal',
    'online IT exams',
    'student progress tracker',
    'habit tracker for students',
    'IT learning resources',
  ],
})

export default function HomePage() {
  return (
    <>
      <HomePageClient />
      <HomeRecentExams />
    </>
  )
}
