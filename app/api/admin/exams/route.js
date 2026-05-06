import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import Exam from '@/lib/models/Exam'
import Question from '@/lib/models/Question'
import Submission from '@/lib/models/Submission'

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    await connectDB()
    const exams = await Exam.find({}, { questions: 0 }).sort({ createdAt: -1 }).lean()
    const examIds = exams.map((exam) => exam._id)

    const questionCounts = await Question.aggregate([
      { $match: { examId: { $in: examIds } } },
      { $group: { _id: '$examId', count: { $sum: 1 } } },
    ])

    const submissionCounts = await Submission.aggregate([
      { $match: { examId: { $in: examIds } } },
      { $group: { _id: '$examId', count: { $sum: 1 } } },
    ])

    const questionCountMap = Object.fromEntries(questionCounts.map((item) => [item._id.toString(), item.count]))
    const submissionCountMap = Object.fromEntries(submissionCounts.map((item) => [item._id.toString(), item.count]))

    const result = exams.map((exam) => ({
      ...exam,
      questionCount: questionCountMap[exam._id.toString()] || 0,
      submissionCount: submissionCountMap[exam._id.toString()] || 0,
    }))

    return NextResponse.json(result)
  } catch (error) {
    logger.error('[GET /api/admin/exams]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
