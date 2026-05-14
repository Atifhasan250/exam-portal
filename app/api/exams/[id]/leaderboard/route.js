import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getRankedLiveSubmissions, toPublicLeaderboardSubmission } from '@/lib/leaderboard'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('exam id')

    const submissions = await getRankedLiveSubmissions({ examId: id })
    return NextResponse.json(submissions.map(toPublicLeaderboardSubmission))
  } catch (error) {
    logger.error('[GET /api/exams/[id]/leaderboard]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
