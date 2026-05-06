import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import Submission from '@/lib/models/Submission'

export async function GET(_request, { params }) {
  try {
    const { clerkUserId } = await params
    await connectDB()
    const submissions = await Submission.find({ clerkUserId })
      .populate('examId', 'title')
      .sort({ score: -1, submittedAt: -1 })

    const uniqueSubmissions = []
    const seenExams = new Set()

    for (const submission of submissions) {
      const examId = submission.examId?._id?.toString()
      if (examId && !seenExams.has(examId)) {
        seenExams.add(examId)
        uniqueSubmissions.push(submission)
      }
    }

    return NextResponse.json(uniqueSubmissions)
  } catch (error) {
    logger.error('[GET /api/submissions/user/[clerkUserId]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
