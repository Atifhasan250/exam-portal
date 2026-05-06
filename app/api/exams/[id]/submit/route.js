import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { getClerkSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { validate, submitExamSchema } from '@/lib/validation'
import { logger } from '@/lib/logger'
import Exam from '@/lib/models/Exam'
import Question from '@/lib/models/Question'
import Submission from '@/lib/models/Submission'

export async function POST(request, { params }) {
  const limited = await rateLimit(request, {
    name: 'exam-submit',
    windowMs: 60 * 1000,
    max: 30,
    message: 'Too many submission attempts.',
  })
  if (limited) return limited

  try {
    const { id } = await params
    await connectDB()
    const exam = await Exam.findById(id).lean()
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    const { userId } = await getClerkSession()
    if (!userId) {
      return NextResponse.json({ error: 'Please sign in before taking an exam.' }, { status: 401 })
    }

    // ── Validate input ──────────────────────────────────────────────
    const raw = await request.json()
    const parsed = validate(submitExamSchema, raw)
    if (!parsed.success) return parsed.response

    const { answers, studentName } = parsed.data

    const questions = await Question.find({ examId: exam._id }).sort({ order: 1 }).lean()

    let score = 0
    let wrong = 0
    let unanswered = 0
    questions.forEach((question, index) => {
      if (answers[index] === undefined || answers[index] === null) unanswered += 1
      else if (answers[index] === question.correct) score += 1
      else wrong += 1
    })

    const now = new Date()
    const wasLive = exam.liveStart && exam.liveEnd &&
      now >= new Date(exam.liveStart) && now <= new Date(exam.liveEnd)

    // ── Transaction: duplicate check + create (atomic) ──────────────
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        if (wasLive) {
          const existingSubmission = await Submission.findOne({
            examId: exam._id,
            clerkUserId: userId,
          }).session(session)

          if (existingSubmission) {
            throw new Error('DUPLICATE_SUBMISSION')
          }
        }

        await Submission.create(
          [
            {
              examId: exam._id,
              clerkUserId: userId,
              studentName,
              score,
              total: questions.length,
              wrong,
              unanswered,
              wasLive,
              answers,
            },
          ],
          { session },
        )
      })

      return NextResponse.json({ score, total: questions.length, wrong, unanswered, questions })
    } catch (txError) {
      if (txError.message === 'DUPLICATE_SUBMISSION') {
        return NextResponse.json(
          { error: 'You have already completed this live exam.' },
          { status: 409 },
        )
      }
      throw txError
    } finally {
      await session.endSession()
    }
  } catch (error) {
    logger.error('[POST /api/exams/[id]/submit]', { error })
    return NextResponse.json(
      { error: logger.safeErrorMessage(error) },
      { status: 500 },
    )
  }
}
