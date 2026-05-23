import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/auditLog'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'
import { invalidateExamCaches } from '@/lib/publicCache'
import Exam from '@/lib/models/Exam'
import Question from '@/lib/models/Question'

export async function DELETE(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    const { id, questionId } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('exam id')
    if (!isValidObjectId(questionId)) return invalidIdResponse('question id')

    await connectDB()
    const exam = await Exam.findById(id)
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    const question = await Question.findOne({ _id: questionId, examId: exam._id })
    if (question) {
      await Question.findByIdAndDelete(question._id)
      await logAdminAction(request, adminCheck.admin, 'DELETE_QUESTION', exam._id, { questionId })
      await invalidateExamCaches(exam._id.toString())
    }

    const remaining = await Question.find({ examId: exam._id }).sort({ order: 1 }).lean()
    return NextResponse.json({ ...exam.toObject(), questions: remaining })
  } catch (error) {
    logger.error('[DELETE /api/exams/[id]/questions/[questionId]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
