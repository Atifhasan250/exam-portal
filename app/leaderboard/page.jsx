import { connectDB } from '@/lib/db'
import Exam from '@/lib/models/Exam'
import Submission from '@/lib/models/Submission'
import LeaderboardClient from './LeaderboardClient'
import { buildPageMetadata } from '@/lib/site'

export const revalidate = 60
export const metadata = buildPageMetadata({
  title: 'Leaderboard',
  description:
    'View live exam rankings, compare student results, and track performance across published live assessments.',
  path: '/leaderboard',
  keywords: ['exam leaderboard', 'student ranking', 'live exam results'],
})

function toPublicLeaderboardSubmission(submission) {
  return {
    _id: submission._id,
    studentName: submission.studentName,
    score: submission.score,
    total: submission.total,
    wrong: submission.wrong,
    unanswered: submission.unanswered,
    submittedAt: submission.submittedAt,
  }
}

async function getLeaderboardData() {
  await connectDB()
  const exams = await Exam.find(
    { published: true, liveStart: { $exists: true } },
    { questions: 0 },
  ).sort({ liveEnd: -1 }).lean()

  const examIds = exams.map((exam) => exam._id)
  const submissions = await Submission.find({ examId: { $in: examIds }, wasLive: true })
    .sort({ score: -1, submittedAt: 1 })
    .lean()

  const grouped = {}
  for (const submission of submissions) {
    const key = submission.examId.toString()
    if (!grouped[key]) grouped[key] = { seen: new Set(), list: [] }
    if (!grouped[key].seen.has(submission.clerkUserId)) {
      grouped[key].seen.add(submission.clerkUserId)
      grouped[key].list.push(submission)
    }
  }

  const data = exams
    .map((exam) => ({
      exam,
      submissions: (grouped[exam._id.toString()]?.list || []).map(toPublicLeaderboardSubmission),
    }))
    .filter((item) => item.submissions.length > 0)

  return JSON.parse(JSON.stringify(data))
}

export default async function LeaderboardPage() {
  const data = await getLeaderboardData()
  return <LeaderboardClient initialData={data} />
}
