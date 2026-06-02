import { NextResponse } from 'next/server'
import { getClerkSession } from '@/lib/auth'
import { getAiLimits, getAiQuota } from '@/lib/resourceAi'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await getClerkSession()
    const limits = getAiLimits()
    if (!userId) {
      return NextResponse.json({
        authenticated: false,
        limit: limits.dailyLimit,
        remaining: 0,
        maxMessageChars: limits.maxMessageChars,
      }, { status: 401 })
    }

    const quota = await getAiQuota(userId)
    return NextResponse.json({
      authenticated: true,
      ...quota,
      maxMessageChars: limits.maxMessageChars,
    })
  } catch (error) {
    logger.error('[GET /api/resources/ai/quota]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
