import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getCachedResourceCategoriesWithCounts } from '@/lib/publicCache'

export const revalidate = 60

export async function GET() {
  try {
    return NextResponse.json(
      await getCachedResourceCategoriesWithCounts(),
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    )
  } catch (error) {
    logger.error('[GET /api/resources/categories]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
