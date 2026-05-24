import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireUserOrAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import Submission from '@/lib/models/Submission'

// Returns array of examId strings where this user submitted a LIVE attempt
export async function GET(_request, { params }) {
  try {
    const { clerkUserId } = await params
    const authCheck = await requireUserOrAdmin(clerkUserId)
    if (!authCheck.ok) return authCheck.response

    await connectDB()

    const examIds = (await Submission.distinct('examId', { clerkUserId, wasLive: true }))
      .map((examId) => examId?.toString())
      .filter(Boolean)

    return NextResponse.json(examIds)
  } catch (error) {
    logger.error('[GET /api/submissions/user/[clerkUserId]/live]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
