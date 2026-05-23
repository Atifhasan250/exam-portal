import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getClerkSession } from '@/lib/auth'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { rateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'
import Exam from '@/lib/models/Exam'
import Question from '@/lib/models/Question'
import Submission from '@/lib/models/Submission'
import ExamAttempt from '@/lib/models/ExamAttempt'

function toPublicQuestion(question) {
  return {
    _id: question._id,
    question: question.question,
    options: question.options,
    order: question.order,
  }
}

function isActiveLiveExam(exam, now) {
  const liveStart = exam.liveStart ? new Date(exam.liveStart) : null
  const liveEnd = exam.liveEnd ? new Date(exam.liveEnd) : null
  return Boolean(liveStart && liveEnd && now >= liveStart && now <= liveEnd)
}

function orderQuestionsByAttempt(questionIds, questions) {
  const questionMap = new Map(questions.map((question) => [question._id.toString(), question]))
  return questionIds
    .map((questionId) => questionMap.get(questionId.toString()))
    .filter(Boolean)
}

export async function POST(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const limited = await rateLimit(request, {
    name: 'exam-attempt-start',
    windowMs: 60 * 1000,
    max: 20,
    message: 'Too many attempt start requests.',
  })
  if (limited) return limited

  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('exam id')

    const { userId } = await getClerkSession()
    if (!userId) {
      return NextResponse.json({ error: 'Please sign in before taking an exam.' }, { status: 401 })
    }

    await connectDB()
    const exam = await Exam.findOne({ _id: id, published: true }).lean()
    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })

    const now = new Date()
    if (!isActiveLiveExam(exam, now)) {
      return NextResponse.json({ error: 'This live exam is not active.' }, { status: 403 })
    }

    const existingSubmission = await Submission.exists({ examId: exam._id, clerkUserId: userId, wasLive: true })
    if (existingSubmission) {
      return NextResponse.json({ error: 'You have already completed this live exam.' }, { status: 409 })
    }

    const questions = await Question.find({ examId: exam._id }).sort({ order: 1 }).lean()
    if (questions.length === 0) {
      return NextResponse.json({ error: 'This exam has no questions yet.' }, { status: 404 })
    }

    const existingAttempt = await ExamAttempt.findOne({ examId: exam._id, clerkUserId: userId })
    if (existingAttempt) {
      if (existingAttempt.status === 'submitted') {
        return NextResponse.json({ error: 'You have already completed this live exam.' }, { status: 409 })
      }
      if (existingAttempt.expiresAt <= now) {
        existingAttempt.status = 'expired'
        await existingAttempt.save()
        return NextResponse.json({ error: 'This attempt has expired.' }, { status: 403 })
      }

      return NextResponse.json({
        attemptId: existingAttempt._id,
        expiresAt: existingAttempt.expiresAt,
        questions: orderQuestionsByAttempt(existingAttempt.questionIds, questions).map(toPublicQuestion),
      })
    }

    const liveEnd = new Date(exam.liveEnd)
    const durationEnd = new Date(now.getTime() + exam.duration * 60 * 1000)
    const expiresAt = new Date(Math.min(liveEnd.getTime(), durationEnd.getTime()))

    const attempt = await ExamAttempt.create({
      examId: exam._id,
      clerkUserId: userId,
      startedAt: now,
      expiresAt,
      questionIds: questions.map((question) => question._id),
    })

    return NextResponse.json({
      attemptId: attempt._id,
      expiresAt: attempt.expiresAt,
      questions: questions.map(toPublicQuestion),
    }, { status: 201 })
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'An exam attempt already exists.' }, { status: 409 })
    }
    logger.error('[POST /api/exams/[id]/attempts/start]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
