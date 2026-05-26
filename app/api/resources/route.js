import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { normalizeSearchQuery } from '@/lib/resourceUtils'
import { getCachedPublicResources } from '@/lib/publicCache'

export const revalidate = 60

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')?.trim()
    const type = searchParams.get('type')?.trim()
    const level = searchParams.get('level')?.trim()
    const q = normalizeSearchQuery(searchParams.get('q'))
    const featured = searchParams.get('featured')
    const sort = searchParams.get('sort')?.trim()
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const rawLimit = !limitParam?.trim() ? NaN : Number(limitParam)
    const rawOffset = !offsetParam?.trim() ? NaN : Number(offsetParam)
    const parsedLimit = Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 100
    const parsedOffset = Number.isFinite(rawOffset) ? Math.trunc(rawOffset) : 0
    const limit = Math.max(1, Math.min(parsedLimit, 200))
    const offset = Math.max(0, parsedOffset)

    const { resources, totalCount, hasMoreResources } = await getCachedPublicResources({
      category,
      type,
      level,
      q,
      featured,
      sort,
      limit,
      offset,
    })

    return NextResponse.json(resources, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Total-Count': String(totalCount),
        'X-Has-More': String(hasMoreResources),
      },
    })
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) return NextResponse.json([])
    logger.error('[GET /api/resources]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
