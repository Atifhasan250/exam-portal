import { connectDB } from '@/lib/db'
import Exam from '@/lib/models/Exam'
import Submission from '@/lib/models/Submission'

export function toPublicLeaderboardSubmission(submission) {
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

function firstRankedSubmissionPerExamUser(submissions) {
  const seenExamUsers = new Set()
  const ranked = []

  for (const submission of submissions) {
    const examKey = submission.examId?.toString() || 'unknown-exam'
    const userKey = submission.clerkUserId || submission._id.toString()
    const key = `${examKey}:${userKey}`
    if (seenExamUsers.has(key)) continue

    seenExamUsers.add(key)
    ranked.push(submission)
  }

  return ranked
}

export async function getRankedLiveSubmissions(filter) {
  await connectDB()

  const submissions = await Submission.find({ ...filter, wasLive: true })
    .sort({ score: -1, submittedAt: 1, _id: 1 })
    .lean()

  return firstRankedSubmissionPerExamUser(submissions)
}

export async function getLiveSubmissionRankMap(examIds) {
  await connectDB()

  const ids = examIds.filter(Boolean)
  if (ids.length === 0) return new Map()

  const submissions = await Submission.find({ examId: { $in: ids }, wasLive: true })
    .sort({ examId: 1, score: -1, submittedAt: 1, _id: 1 })
    .lean()

  const grouped = new Map()
  for (const submission of submissions) {
    const key = submission.examId.toString()
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(submission)
  }

  const rankMap = new Map()
  for (const group of grouped.values()) {
    firstRankedSubmissionPerExamUser(group).forEach((submission, index) => {
      rankMap.set(submission._id.toString(), index + 1)
    })
  }

  return rankMap
}

export async function getLeaderboardData() {
  await connectDB()

  const exams = await Exam.find(
    { published: true, liveStart: { $exists: true } },
    { questions: 0 },
  ).sort({ liveEnd: -1 }).lean()

  const examIds = exams.map((exam) => exam._id)
  const submissions = await getRankedLiveSubmissions({ examId: { $in: examIds } })

  const grouped = {}
  for (const submission of submissions) {
    const key = submission.examId.toString()
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(submission)
  }

  return exams
    .map((exam) => ({
      exam,
      submissions: (grouped[exam._id.toString()] || []).map(toPublicLeaderboardSubmission),
    }))
    .filter((item) => item.submissions.length > 0)
}
