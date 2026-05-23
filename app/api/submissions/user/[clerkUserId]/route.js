import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireUserOrAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import Submission from '@/lib/models/Submission'
import '@/lib/models/Exam' // register Exam schema so populate('examId') resolves correctly

export async function GET(_request, { params }) {
  try {
    const { clerkUserId } = await params
    const authCheck = await requireUserOrAdmin(clerkUserId)
    if (!authCheck.ok) return authCheck.response

    await connectDB()
    const submissions = await Submission.find({ clerkUserId })
      .populate('examId', 'title')
      .sort({ score: -1, submittedAt: -1 })
      .lean()

    const uniqueSubmissions = []
    const seenExams = new Set()

    for (const submission of submissions) {
      const examId = submission.examId?._id?.toString()
      if (examId && !seenExams.has(examId)) {
        seenExams.add(examId)
        uniqueSubmissions.push({
          _id: submission._id,
          examId: submission.examId
            ? {
                _id: submission.examId._id,
                title: submission.examId.title,
              }
            : null,
          score: submission.score,
          total: submission.total,
          wrong: submission.wrong,
          unanswered: submission.unanswered,
          wasLive: submission.wasLive,
          attemptCount: submission.attemptCount || 1,
          submittedAt: submission.submittedAt,
          lastAttemptAt: submission.lastAttemptAt || submission.submittedAt,
        })
      }
    }

    return NextResponse.json(uniqueSubmissions)
  } catch (error) {
    logger.error('[GET /api/submissions/user/[clerkUserId]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
