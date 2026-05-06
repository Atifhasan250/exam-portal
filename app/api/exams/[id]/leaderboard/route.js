import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import Submission from '@/lib/models/Submission'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    await connectDB()
    const submissions = await Submission.find({ examId: id, wasLive: true }).sort({ score: -1, submittedAt: 1 })
    return NextResponse.json(submissions)
  } catch (error) {
    logger.error('[GET /api/exams/[id]/leaderboard]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
