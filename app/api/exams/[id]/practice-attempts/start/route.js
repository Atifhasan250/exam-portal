import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getClerkSession } from '@/lib/auth'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { rateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'
import Exam from '@/lib/models/Exam'
import Submission from '@/lib/models/Submission'
import PracticeAttempt from '@/lib/models/PracticeAttempt'

function isPracticeAvailable(exam, now) {
  const liveStart = exam.liveStart ? new Date(exam.liveStart) : null
  const liveEnd = exam.liveEnd ? new Date(exam.liveEnd) : null

  if (liveStart && liveEnd && now <= liveEnd) return false
  if (liveStart && !liveEnd && now < liveStart) return false
  return true
}

export async function POST(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('exam id')

    const { userId } = await getClerkSession()
    if (!userId) {
      return NextResponse.json({ error: 'Please sign in before taking an exam.' }, { status: 401 })
    }

    const limited = await rateLimit(request, {
      name: 'practice-attempt-start',
      windowMs: 60 * 1000,
      max: 12,
      keyParts: [userId, id],
      message: 'Too many practice starts for this exam.',
    })
    if (limited) return limited

    await connectDB()
    const exam = await Exam.findOne({ _id: id, published: true }, { liveStart: 1, liveEnd: 1 }).lean()
    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })

    const now = new Date()
    if (!isPracticeAvailable(exam, now)) {
      return NextResponse.json({ error: 'This exam is not available for practice yet.' }, { status: 403 })
    }

    const existingPracticeSubmissions = await Submission.find(
      { examId: exam._id, clerkUserId: userId, wasLive: false },
      { attemptCount: 1 },
    ).lean()
    const priorSubmittedPracticeAttemptCount = existingPracticeSubmissions.reduce(
      (totalAttempts, submission) => totalAttempts + (submission.attemptCount || 1),
      0,
    )

    await PracticeAttempt.updateMany(
      {
        examId: exam._id,
        clerkUserId: userId,
        status: 'started',
        startedAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      { $set: { status: 'abandoned', abandonedAt: now } },
    )

    const practiceAttempt = await PracticeAttempt.create({
      examId: exam._id,
      clerkUserId: userId,
      startedAt: now,
      status: 'started',
    })

    const recordedPracticeStartCount = await PracticeAttempt.countDocuments({
      examId: exam._id,
      clerkUserId: userId,
    })
    const attemptCount = Math.max(recordedPracticeStartCount, priorSubmittedPracticeAttemptCount + 1)

    await Submission.updateMany(
      { examId: exam._id, clerkUserId: userId, wasLive: false },
      {
        $max: { attemptCount },
        $set: { lastAttemptAt: now },
      },
    )

    return NextResponse.json({
      ok: true,
      attemptCount,
      practiceAttemptId: practiceAttempt._id.toString(),
    }, { status: 201 })
  } catch (error) {
    logger.error('[POST /api/exams/[id]/practice-attempts/start]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
