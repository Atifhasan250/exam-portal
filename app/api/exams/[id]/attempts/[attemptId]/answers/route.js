import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getClerkSession } from '@/lib/auth'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { validate, attemptAnswerSchema } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'
import Question from '@/lib/models/Question'
import ExamAttempt from '@/lib/models/ExamAttempt'

export async function POST(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  try {
    const { id, attemptId } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('exam id')
    if (!isValidObjectId(attemptId)) return invalidIdResponse('attempt id')

    const { userId } = await getClerkSession()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const raw = await request.json()
    const parsed = validate(attemptAnswerSchema, raw)
    if (!parsed.success) return parsed.response

    const { questionIndex, optionIndex } = parsed.data
    const answerKey = String(questionIndex)
    const now = new Date()

    await connectDB()
    const attempt = await ExamAttempt.findOne({
      _id: attemptId,
      examId: id,
      clerkUserId: userId,
      status: 'in_progress',
      expiresAt: { $gt: now },
    })

    if (!attempt) {
      return NextResponse.json({ error: 'Active attempt not found.' }, { status: 404 })
    }

    const existingAnswer = attempt.answers?.get(answerKey)
    if (existingAnswer !== undefined) {
      if (existingAnswer === optionIndex) return NextResponse.json({ ok: true, locked: true })
      return NextResponse.json({ error: 'This answer is already locked.' }, { status: 409 })
    }

    const questionId = attempt.questionIds[questionIndex]
    if (!questionId) {
      return NextResponse.json({ error: 'Invalid question index.' }, { status: 400 })
    }

    const question = await Question.findOne({ _id: questionId, examId: id }, { options: 1 }).lean()
    if (!question || optionIndex >= question.options.length) {
      return NextResponse.json({ error: 'Invalid answer option.' }, { status: 400 })
    }

    const updated = await ExamAttempt.findOneAndUpdate(
      {
        _id: attemptId,
        examId: id,
        clerkUserId: userId,
        status: 'in_progress',
        expiresAt: { $gt: now },
        [`answers.${answerKey}`]: { $exists: false },
      },
      { $set: { [`answers.${answerKey}`]: optionIndex } },
      { new: true, lean: true },
    )

    if (!updated) {
      const current = await ExamAttempt.findById(attemptId)
      if (current?.answers?.get(answerKey) === optionIndex) {
        return NextResponse.json({ ok: true, locked: true })
      }
      return NextResponse.json({ error: 'This answer is already locked.' }, { status: 409 })
    }

    return NextResponse.json({ ok: true, locked: true })
  } catch (error) {
    logger.error('[POST /api/exams/[id]/attempts/[attemptId]/answers]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
