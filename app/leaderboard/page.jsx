import { connectDB } from '@/lib/db'
import Exam from '@/lib/models/Exam'
import Submission from '@/lib/models/Submission'
import LeaderboardClient from './LeaderboardClient'

export const revalidate = 60

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
    .map((exam) => ({ exam, submissions: grouped[exam._id.toString()]?.list || [] }))
    .filter((item) => item.submissions.length > 0)

  // Serialize for client (ObjectIds → strings, Dates → ISO strings)
  return JSON.parse(JSON.stringify(data))
}

export default async function LeaderboardPage() {
  const data = await getLeaderboardData()
  return <LeaderboardClient initialData={data} />
}
