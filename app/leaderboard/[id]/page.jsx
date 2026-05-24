import { connectDB } from '@/lib/db'
import Exam from '@/lib/models/Exam'
import LeaderboardClient from '../LeaderboardClient'
import { buildPageMetadata } from '@/lib/site'
import { getCachedExamLeaderboardData } from '@/lib/publicCache'
import { isValidObjectId } from '@/lib/routeParams'

export const revalidate = 60

export async function generateMetadata({ params }) {
  const { id } = await params
  if (!isValidObjectId(id)) {
    return buildPageMetadata({
      title: 'Leaderboard Not Found',
      description: 'The requested leaderboard could not be found.',
      path: `/leaderboard/${id}`,
    })
  }

  try {
    await connectDB()
    const exam = await Exam.findOne({ _id: id, published: true }, { title: 1 }).lean()

    if (!exam) {
      return buildPageMetadata({
        title: 'Leaderboard Not Found',
        description: 'The requested leaderboard could not be found.',
        path: `/leaderboard/${id}`,
      })
    }

    return buildPageMetadata({
      title: `${exam.title} Leaderboard`,
      description: `See ranked results for ${exam.title} and compare student performance on IT Resource Zone.`,
      path: `/leaderboard/${id}`,
      keywords: ['exam leaderboard', exam.title, 'student results'],
    })
  } catch {
    return buildPageMetadata({
      title: 'Leaderboard',
      description: 'View exam leaderboard results on IT Resource Zone.',
      path: `/leaderboard/${id}`,
    })
  }
}

export default async function SingleLeaderboardPage({ params }) {
  const { id } = await params
  if (!isValidObjectId(id)) return <LeaderboardClient initialData={[]} selectedExamId={id} />
  const data = await getCachedExamLeaderboardData(id)
  return <LeaderboardClient initialData={data} selectedExamId={id} />
}
