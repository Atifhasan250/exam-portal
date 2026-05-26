import LeaderboardClient from './LeaderboardClient'
import { buildPageMetadata } from '@/lib/site'
import { getCachedLeaderboardData } from '@/lib/publicCache'

export const dynamic = 'force-dynamic'
export const revalidate = 60
export const metadata = buildPageMetadata({
  title: 'Leaderboard',
  description:
    'View live exam rankings, compare student results, and track performance across published live assessments.',
  path: '/leaderboard',
  keywords: ['exam leaderboard', 'student ranking', 'live exam results'],
})

export default async function LeaderboardPage() {
  const data = await getCachedLeaderboardData()
  return <LeaderboardClient initialData={data} />
}
