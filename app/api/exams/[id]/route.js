import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { validate, updateExamSchema } from '@/lib/validation'
import { logAdminAction } from '@/lib/auditLog'
import { logger } from '@/lib/logger'
import Exam from '@/lib/models/Exam'
import Question from '@/lib/models/Question'
import Submission from '@/lib/models/Submission'

function toPublicQuestion(question) {
  return {
    _id: question._id,
    question: question.question,
    options: question.options,
    order: question.order,
  }
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    await connectDB()
    const exam = await Exam.findOne({ _id: id, published: true }).lean()
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    const questions = await Question.find({ examId: exam._id }).sort({ order: 1 }).lean()
    return NextResponse.json({
      ...exam,
      questions: questions.map(toPublicQuestion),
    })
  } catch (error) {
    logger.error('[GET /api/exams/[id]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    const { id } = await params
    await connectDB()

    // ── Validate input ──────────────────────────────────────────────
    const raw = await request.json()
    const parsed = validate(updateExamSchema, raw)
    if (!parsed.success) return parsed.response

    const { title, duration, liveStart, liveEnd } = parsed.data
    const exam = await Exam.findByIdAndUpdate(
      id,
      { $set: { title, duration, liveStart, liveEnd } },
      { new: true },
    )

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    logAdminAction(request, adminCheck.admin, 'UPDATE_EXAM', exam._id, { title })

    return NextResponse.json(exam)
  } catch (error) {
    logger.error('[PUT /api/exams/[id]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    const { id } = await params
    await connectDB()

    // ── Transaction: delete exam + questions + submissions atomically ─
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await Exam.findByIdAndDelete(id).session(session)
        await Question.deleteMany({ examId: id }).session(session)
        await Submission.deleteMany({ examId: id }).session(session)
      })
    } finally {
      await session.endSession()
    }

    logAdminAction(request, adminCheck.admin, 'DELETE_EXAM', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[DELETE /api/exams/[id]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
