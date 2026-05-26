import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getCachedResourceCategoriesWithCounts } from '@/lib/publicCache'

export const dynamic = 'force-dynamic'
export const revalidate = 60

const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: privateHeaders })

  try {
    return NextResponse.json(
      await getCachedResourceCategoriesWithCounts(),
      { headers: privateHeaders },
    )
  } catch (error) {
    logger.error('[GET /api/resources/categories]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
