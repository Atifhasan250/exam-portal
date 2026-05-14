import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'
import Exam from '@/lib/models/Exam'
import Question from '@/lib/models/Question'

export async function GET(_request, { params }) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('exam id')

    await connectDB()
    const exam = await Exam.findById(id).lean()
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    const questions = await Question.find({ examId: exam._id }).sort({ order: 1 }).lean()
    return NextResponse.json({ ...exam, questions })
  } catch (error) {
    logger.error('[GET /api/admin/exams/[id]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
