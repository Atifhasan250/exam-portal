import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getCachedLeaderboardData } from '@/lib/publicCache'

export async function GET() {
  try {
    const data = await getCachedLeaderboardData()

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch (error) {
    logger.error('[GET /api/leaderboard]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
