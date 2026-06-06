import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getClerkSession } from '@/lib/auth'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { logger } from '@/lib/logger'
import Resource from '@/lib/models/Resource'
import '@/lib/models/ResourceCategory'
import {
  appendAiChatHistory,
  ensureAiUsageAtLeast,
  enforceAiUserMinuteLimit,
  generateResourceAiAnswer,
  getAiChatHistory,
  getAiLimits,
  getAiQuota,
  getCachedAiAnswer,
  isAiContinuationPrompt,
  mergeAiContinuationHistory,
  normalizeAiMessage,
  refundAiUsage,
  reserveAiUsage,
  setCachedAiAnswer,
} from '@/lib/resourceAi'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const originCheck = enforceSameOrigin(request, { allowMissingOrigin: true })
  if (originCheck) return originCheck

  try {
    const { userId } = await getClerkSession()
    if (!userId) {
      return NextResponse.json({ error: 'Please sign in to use the doubt solver.' }, { status: 401 })
    }

    const { slug } = await params
    await connectDB()
    const resource = await findPublishedResourceBySlug(slug)
    if (!resource) return NextResponse.json({ error: 'Resource not found.' }, { status: 404 })

    const messages = await getAiChatHistory(userId, resource._id.toString())
    const todayUserMessages = countTodayUserMessages(messages)
    const quota = await ensureAiUsageAtLeast(userId, todayUserMessages)
    return NextResponse.json({
      messages,
      quota,
      maxMessageChars: getAiLimits().maxMessageChars,
    })
  } catch (error) {
    logger.error('[GET /api/resources/[slug]/ai-chat]', { error })
    return NextResponse.json({ error: 'AI chat could not be loaded right now.' }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  let reservedQuotaUserId = null

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
    const resourceId = resource._id.toString()
    const history = await getAiChatHistory(userId, resourceId)
    const isContinuation = isAiContinuationPrompt(message) && history.some((entry) => entry.role === 'assistant')

    const resourceUpdatedAt = resource.updatedAt?.toISOString?.() || resource.updatedAt || ''
    const cached = isContinuation ? null : await getCachedAiAnswer(resourceId, message, resourceUpdatedAt)
    if (cached?.answer) {
      const quotaBefore = await getAiQuota(userId)
      await appendAiChatHistory(userId, resourceId, [
        { role: 'user', text: message, billable: false, createdAt: new Date().toISOString() },
        { role: 'assistant', text: cached.answer, createdAt: new Date().toISOString() },
      ])

      return NextResponse.json({
        ...cached,
        cached: true,
        quota: quotaBefore,
        maxMessageChars: limits.maxMessageChars,
      })
    }

    const quotaBefore = await getAiQuota(userId)
    if (quotaBefore.remaining <= 0) {
      return NextResponse.json({
        error: 'Daily AI message limit reached.',
        quota: quotaBefore,
        maxMessageChars: limits.maxMessageChars,
      }, { status: 429 })
    }

    const minuteLimit = await enforceAiUserMinuteLimit(userId)
    if (!minuteLimit.allowed) {
      return NextResponse.json({
        error: 'You are sending messages too quickly. Please wait a bit.',
        quota: quotaBefore,
        maxMessageChars: limits.maxMessageChars,
        minuteLimit,
      }, { status: 429 })
    }

    const quotaReservation = await reserveAiUsage(userId)
    if (!quotaReservation.allowed) {
      const quota = await refundAiUsage(userId)
      return NextResponse.json({
        error: 'Daily AI message limit reached.',
        quota,
        maxMessageChars: limits.maxMessageChars,
      }, { status: 429 })
    }
    reservedQuotaUserId = userId

    const generated = await generateResourceAiAnswer(resource, message, history)
    if (isContinuation) {
      await mergeAiContinuationHistory(userId, resourceId, generated.answer)
    } else {
      await setCachedAiAnswer(resourceId, message, resourceUpdatedAt, generated)
      await appendAiChatHistory(userId, resourceId, [
        { role: 'user', text: message, billable: true, createdAt: new Date().toISOString() },
        { role: 'assistant', text: generated.answer, createdAt: new Date().toISOString() },
      ])
    }
    reservedQuotaUserId = null

    return NextResponse.json({
      ...generated,
      cached: false,
      mergeWithPreviousAssistant: isContinuation,
      quota: quotaReservation,
      maxMessageChars: limits.maxMessageChars,
    })
  } catch (error) {
    if (reservedQuotaUserId) {
      try {
        await refundAiUsage(reservedQuotaUserId)
      } catch (refundError) {
        logger.warn('[POST /api/resources/[slug]/ai-chat] quota refund failed', { error: refundError })
      }
    }
    if (error.message === 'AI_PROVIDER_NOT_CONFIGURED') {
      return NextResponse.json({ error: 'AI provider is not configured.' }, { status: 503 })
    }
    logger.error('[POST /api/resources/[slug]/ai-chat]', { error })
    return NextResponse.json({ error: 'AI response failed. Please try again shortly.' }, { status: 500 })
  }
}

function countTodayUserMessages(messages) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  return messages.filter((message) => {
    if (message.role !== 'user' || message.billable === false) return false
    const createdAt = new Date(message.createdAt)
    if (Number.isNaN(createdAt.getTime())) return false
    const messageDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(createdAt)
    return messageDay === today
  }).length
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
