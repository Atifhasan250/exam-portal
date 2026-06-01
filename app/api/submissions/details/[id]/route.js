import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getClerkSession, verifyAdminToken } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'
import Submission from '@/lib/models/Submission'
import Question from '@/lib/models/Question'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('submission id')

    await connectDB()
    const submission = await Submission.findById(id).populate('examId', 'title duration liveStart liveEnd')
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const { userId } = await getClerkSession()
    const admin = await verifyAdminToken()
    const isOwner = userId && userId === submission.clerkUserId

    if (!isOwner && !admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const liveStart = submission.examId?.liveStart ? new Date(submission.examId.liveStart) : null
    const liveEnd = submission.examId?.liveEnd ? new Date(submission.examId.liveEnd) : null
    const isLiveActive = Boolean(
      submission.wasLive &&
      liveStart &&
      liveEnd &&
      now >= liveStart &&
      now <= liveEnd,
    )
    const canReviewAnswers = Boolean(admin || !isLiveActive)
    const questions = canReviewAnswers && submission.examId
      ? await Question.find({ examId: submission.examId._id }).sort({ order: 1 }).lean()
      : []

    return NextResponse.json({
      submission: {
        _id: submission._id,
        examId: submission.examId
          ? {
              _id: submission.examId._id,
              title: submission.examId.title,
              duration: submission.examId.duration,
            }
          : {
              _id: submission.examId || null,
              title: submission.examTitleSnapshot || 'Deleted exam',
              duration: null,
            },
        score: submission.score,
        total: submission.total,
        wrong: submission.wrong,
        unanswered: submission.unanswered,
        answers: submission.answers,
        wasLive: submission.wasLive,
        attemptCount: submission.attemptCount || 1,
        submittedAt: submission.submittedAt,
        lastAttemptAt: submission.lastAttemptAt || submission.submittedAt,
      },
      reviewAvailable: canReviewAnswers,
      questions,
    })
  } catch (error) {
    logger.error('[GET /api/submissions/details/[id]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
