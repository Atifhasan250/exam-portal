import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getCachedExamLeaderboardData } from '@/lib/publicCache'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('exam id')
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    return NextResponse.json(await getCachedExamLeaderboardData(id, { limit, offset }))
  } catch (error) {
    logger.error('[GET /api/exams/[id]/leaderboard]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
