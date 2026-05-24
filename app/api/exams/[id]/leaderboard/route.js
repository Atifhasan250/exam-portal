import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getCachedExamLeaderboardData } from '@/lib/publicCache'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('exam id')
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const rawLimit = !limitParam?.trim() ? NaN : Number(limitParam)
    const rawOffset = !offsetParam?.trim() ? NaN : Number(offsetParam)
    const limit = Math.max(1, Math.min(Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 50, 100))
    const offset = Math.max(0, Number.isFinite(rawOffset) ? Math.trunc(rawOffset) : 0)

    return NextResponse.json(await getCachedExamLeaderboardData(id, { limit, offset }))
  } catch (error) {
    logger.error('[GET /api/exams/[id]/leaderboard]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
