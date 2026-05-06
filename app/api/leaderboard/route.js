import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import Exam from '@/lib/models/Exam'
import Submission from '@/lib/models/Submission'

export async function GET() {
  try {
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

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch (error) {
    logger.error('[GET /api/leaderboard]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
