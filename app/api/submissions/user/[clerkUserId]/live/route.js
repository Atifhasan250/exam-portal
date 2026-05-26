import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireUserOrAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import Submission from '@/lib/models/Submission'
import ExamAttempt from '@/lib/models/ExamAttempt'

// Returns array of live exam ids already consumed by this user.
export async function GET(_request, { params }) {
  try {
    const { clerkUserId } = await params
    const authCheck = await requireUserOrAdmin(clerkUserId)
    if (!authCheck.ok) return authCheck.response

    await connectDB()

    const [submittedExamIds, startedExamIds] = await Promise.all([
      Submission.distinct('examId', { clerkUserId, wasLive: true }),
      ExamAttempt.distinct('examId', { clerkUserId }),
    ])

    const examIds = [...new Set([...submittedExamIds, ...startedExamIds])]
      .map((examId) => examId?.toString())
      .filter(Boolean)

    return NextResponse.json(examIds)
  } catch (error) {
    logger.error('[GET /api/submissions/user/[clerkUserId]/live]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
