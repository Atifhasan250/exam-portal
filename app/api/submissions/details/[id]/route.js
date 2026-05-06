import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import Submission from '@/lib/models/Submission'
import Question from '@/lib/models/Question'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    await connectDB()
    const submission = await Submission.findById(id).populate('examId', 'title duration')
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const questions = await Question.find({ examId: submission.examId._id }).sort({ order: 1 }).lean()
    return NextResponse.json({ submission, questions })
  } catch (error) {
    logger.error('[GET /api/submissions/details/[id]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
