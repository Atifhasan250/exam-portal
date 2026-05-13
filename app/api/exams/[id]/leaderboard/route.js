import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import Submission from '@/lib/models/Submission'

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

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    await connectDB()
    const submissions = await Submission.find({ examId: id, wasLive: true })
      .sort({ score: -1, submittedAt: 1 })
      .lean()
    return NextResponse.json(submissions.map(toPublicLeaderboardSubmission))
  } catch (error) {
    logger.error('[GET /api/exams/[id]/leaderboard]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
