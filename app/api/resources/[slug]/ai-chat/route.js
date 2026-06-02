import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getClerkSession } from '@/lib/auth'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { logger } from '@/lib/logger'
import Resource from '@/lib/models/Resource'
import {
  generateResourceAiAnswer,
  getAiLimits,
  getAiQuota,
  getCachedAiAnswer,
  incrementAiUsage,
  normalizeAiMessage,
  setCachedAiAnswer,
} from '@/lib/resourceAi'

export const dynamic = 'force-dynamic'

export async function POST(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  try {
    const { userId } = await getClerkSession()
    if (!userId) {
      return NextResponse.json({ error: 'Please sign in to use the doubt solver.' }, { status: 401 })
    }

    const { slug } = await params
    const raw = await request.json().catch(() => ({}))
    const message = normalizeAiMessage(raw.message)
    const limits = getAiLimits()

    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
    }
    if (message.length > limits.maxMessageChars) {
      return NextResponse.json(
        { error: `Message must be ${limits.maxMessageChars} characters or fewer.` },
        { status: 400 },
      )
    }

    await connectDB()
    const resource = await findPublishedResourceBySlug(slug)
    if (!resource) return NextResponse.json({ error: 'Resource not found.' }, { status: 404 })

    const quotaBefore = await getAiQuota(userId)
    if (quotaBefore.remaining <= 0) {
      return NextResponse.json({
        error: 'Daily AI message limit reached.',
        quota: quotaBefore,
        maxMessageChars: limits.maxMessageChars,
      }, { status: 429 })
    }

    const cached = await getCachedAiAnswer(resource._id.toString(), message)
    if (cached?.answer) {
      return NextResponse.json({
        ...cached,
        cached: true,
        quota: quotaBefore,
        maxMessageChars: limits.maxMessageChars,
      })
    }

    const generated = await generateResourceAiAnswer(resource, message)
    await setCachedAiAnswer(resource._id.toString(), message, generated)
    const quota = await incrementAiUsage(userId)

    return NextResponse.json({
      ...generated,
      cached: false,
      quota,
      maxMessageChars: limits.maxMessageChars,
    })
  } catch (error) {
    if (error.message === 'AI_PROVIDER_NOT_CONFIGURED') {
      return NextResponse.json({ error: 'AI provider is not configured.' }, { status: 503 })
    }
    logger.error('[POST /api/resources/[slug]/ai-chat]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

async function findPublishedResourceBySlug(slug) {
  const baseQuery = { published: true }
  const bySlug = await Resource.findOne({ ...baseQuery, slug })
    .populate('categoryId', 'name slug icon color')
    .lean()
  if (bySlug) return bySlug

  const idCandidate = String(slug || '').split('-').at(-1)
  if (!/^[0-9a-fA-F]{24}$/.test(idCandidate)) return null

  return Resource.findOne({ ...baseQuery, _id: idCandidate })
    .populate('categoryId', 'name slug icon color')
    .lean()
}
