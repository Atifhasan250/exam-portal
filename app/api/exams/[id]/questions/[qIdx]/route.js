import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/auditLog'
import { logger } from '@/lib/logger'
import Exam from '@/lib/models/Exam'
import Question from '@/lib/models/Question'

export async function DELETE(request, { params }) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    const { id, qIdx } = await params
    await connectDB()
    const exam = await Exam.findById(id)
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    const questions = await Question.find({ examId: exam._id }).sort({ order: 1 })
    const questionIndex = parseInt(qIdx, 10)
    if (questions[questionIndex]) {
      await Question.findByIdAndDelete(questions[questionIndex]._id)
      logAdminAction(request, adminCheck.admin, 'DELETE_QUESTION', exam._id, { questionIndex })
    }

    const remaining = await Question.find({ examId: exam._id }).sort({ order: 1 }).lean()
    return NextResponse.json({ ...exam.toObject(), questions: remaining })
  } catch (error) {
    logger.error('[DELETE /api/exams/[id]/questions/[qIdx]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
