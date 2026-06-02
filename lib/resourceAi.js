import { Redis } from '@upstash/redis'
import { createHash } from 'node:crypto'
import { logger } from '@/lib/logger'

const AI_PREFIX = 'irz:ai:v1'
const globalForAi = globalThis
const memoryCache = new Map()
const memoryQuota = new Map()

export function getAiLimits() {
  return {
    dailyLimit: positiveInt(process.env.AI_CHAT_DAILY_LIMIT, 5),
    maxMessageChars: positiveInt(process.env.AI_CHAT_MAX_MESSAGE_CHARS, 50),
    cacheTtlSeconds: positiveInt(process.env.AI_CHAT_CACHE_TTL_SECONDS, 86400),
  }
}

export function normalizeAiMessage(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

export function getAiDayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getAiResetAt(date = new Date()) {
  const dhakaNow = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }))
  dhakaNow.setDate(dhakaNow.getDate() + 1)
  dhakaNow.setHours(0, 0, 0, 0)
  const utcTime = dhakaNow.getTime() - (6 * 60 * 60 * 1000)
  return new Date(utcTime).toISOString()
}

export async function getAiQuota(userId) {
  const { dailyLimit } = getAiLimits()
  const used = await getDailyUsage(userId)
  return {
    limit: dailyLimit,
    used,
    remaining: Math.max(0, dailyLimit - used),
    resetAt: getAiResetAt(),
  }
}

export async function incrementAiUsage(userId) {
  const { dailyLimit } = getAiLimits()
  const redis = getAiRedisClient()
  const key = quotaKey(userId)
  let used

  if (redis) {
    used = Number(await redis.incr(key)) || 1
    if (used === 1) await redis.expire(key, secondsUntilReset())
  } else {
    const now = Date.now()
    const entry = memoryQuota.get(key)
    if (!entry || entry.expiresAt <= now) {
      used = 1
      memoryQuota.set(key, { used, expiresAt: now + secondsUntilReset() * 1000 })
    } else {
      used = entry.used + 1
      entry.used = used
    }
  }

  return {
    limit: dailyLimit,
    used,
    remaining: Math.max(0, dailyLimit - used),
    resetAt: getAiResetAt(),
  }
}

export async function getCachedAiAnswer(resourceId, message) {
  const key = responseCacheKey(resourceId, message)
  const redis = getAiRedisClient()

  try {
    if (redis) {
      const value = await redis.get(key)
      if (!value) return null
      return typeof value === 'string' ? JSON.parse(value) : value
    }

    const entry = memoryCache.get(key)
    if (!entry || entry.expiresAt <= Date.now()) {
      memoryCache.delete(key)
      return null
    }
    return entry.value
  } catch (error) {
    logger.warn('[resource-ai] cache read failed', { error })
    return null
  }
}

export async function setCachedAiAnswer(resourceId, message, value) {
  const key = responseCacheKey(resourceId, message)
  const { cacheTtlSeconds } = getAiLimits()
  const redis = getAiRedisClient()

  try {
    if (redis) {
      await redis.set(key, JSON.stringify(value), { ex: cacheTtlSeconds })
      return
    }
    memoryCache.set(key, { value, expiresAt: Date.now() + cacheTtlSeconds * 1000 })
  } catch (error) {
    logger.warn('[resource-ai] cache write failed', { error })
  }
}

export async function generateResourceAiAnswer(resource, message) {
  const providers = [
    getGeminiProvider(),
    ...getOpenRouterProviders(),
  ].filter(Boolean)

  if (!providers.length) {
    throw new Error('AI_PROVIDER_NOT_CONFIGURED')
  }

  const errors = []
  for (const provider of providers) {
    try {
      if (provider.type === 'gemini') {
        return await callGemini(resource, message, provider)
      }
      return await callOpenRouter(resource, message, provider)
    } catch (error) {
      errors.push({ provider: provider.name, message: error.message })
      logger.warn('[resource-ai] provider failed', { provider: provider.name, error })
    }
  }

  const error = new Error('AI_PROVIDER_FAILED')
  error.details = errors
  throw error
}

function getAiRedisClient() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null

  if (!globalForAi.irzAiRedisClient) {
    globalForAi.irzAiRedisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      automaticDeserialization: false,
    })
  }

  return globalForAi.irzAiRedisClient
}

async function getDailyUsage(userId) {
  const key = quotaKey(userId)
  const redis = getAiRedisClient()

  if (redis) {
    const value = await redis.get(key)
    return Math.max(0, Number(value) || 0)
  }

  const entry = memoryQuota.get(key)
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryQuota.delete(key)
    return 0
  }
  return Math.max(0, Number(entry.used) || 0)
}

function quotaKey(userId) {
  return `${AI_PREFIX}:quota:${getAiDayKey()}:${hash(userId)}`
}

function responseCacheKey(resourceId, message) {
  return `${AI_PREFIX}:answer:${hash(resourceId)}:${hash(normalizeAiMessage(message).toLowerCase())}`
}

function secondsUntilReset() {
  return Math.max(60, Math.ceil((new Date(getAiResetAt()).getTime() - Date.now()) / 1000))
}

function hash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 32)
}

function positiveInt(value, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.trunc(parsed)
}

function getGeminiProvider() {
  if (!process.env.GEMINI_API_KEY) return null
  return {
    type: 'gemini',
    name: 'gemini',
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  }
}

function getOpenRouterProviders() {
  return [1, 2, 3, 4, 5].map((index) => {
    const apiKey = process.env[`OPENROUTER_API_KEY_${index}`]
    const model = process.env[`OPENROUTER_MODEL_${index}`]
    if (!apiKey || !model) return null
    return {
      type: 'openrouter',
      name: `openrouter-${index}`,
      apiKey,
      model,
    }
  }).filter(Boolean)
}

function systemInstruction() {
  return [
    'তুমি IT Resource Zone-এর resource-specific Bangla doubt solver bot.',
    'সব উত্তর অবশ্যই বাংলা ভাষায় দেবে, user English/Banglish/Bangla যাই লিখুক।',
    'শুধু দেওয়া resource context থেকে উত্তর দেবে। resource থেকে নিশ্চিত তথ্য না পেলে পরিষ্কারভাবে বলবে যে এই resource-এ যথেষ্ট তথ্য নেই।',
    'উত্তর ছোট, সহজ, student-friendly এবং practical রাখবে।',
    'ভুল তথ্য বানাবে না।',
  ].join('\n')
}

function buildResourceTextContext(resource) {
  const categoryName = resource.categoryId?.name || ''
  return [
    `Resource title: ${resource.title || ''}`,
    `Type: ${resource.type || ''}`,
    `Category: ${categoryName}`,
    `Level: ${resource.level || ''}`,
    `Language: ${resource.language || ''}`,
    `Description: ${resource.description || ''}`,
    `URL: ${resource.url || resource.imagekitUrl || ''}`,
    resource.channelTitle ? `Channel: ${resource.channelTitle}` : '',
    resource.transcriptText ? `Transcript/context: ${String(resource.transcriptText).slice(0, 12000)}` : '',
  ].filter(Boolean).join('\n')
}

function publicResourceUrl(resource) {
  if (resource.type === 'youtube' && resource.url) return resource.url
  return resource.imagekitUrl || resource.url || resource.thumbnailUrl || ''
}

function mimeForResource(resource) {
  if (resource.type === 'youtube') return 'video/*'
  if (resource.type === 'pdf') return 'application/pdf'
  if (resource.type === 'image') return resource.mimeType || 'image/*'
  return resource.mimeType || 'text/plain'
}

function isPublicUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:')
  } catch {
    return false
  }
}

async function callGemini(resource, message, provider) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(provider.apiKey)}`
  const userParts = [
    { text: `${buildResourceTextContext(resource)}\n\nUser question: ${message}` },
  ]
  const resourceUrl = publicResourceUrl(resource)
  if (isPublicUrl(resourceUrl) && ['youtube', 'pdf', 'image'].includes(resource.type)) {
    userParts.push({
      fileData: {
        fileUri: resourceUrl,
        mimeType: mimeForResource(resource),
      },
    })
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction() }] },
      contents: [{ role: 'user', parts: userParts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 700,
      },
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error?.message || 'Gemini request failed')

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join('\n')
    .trim()
  if (!text) throw new Error('Gemini returned an empty answer')
  return { answer: text, provider: provider.name, model: provider.model }
}

async function callOpenRouter(resource, message, provider) {
  const content = [
    { type: 'text', text: `${buildResourceTextContext(resource)}\n\nUser question: ${message}` },
  ]
  const resourceUrl = publicResourceUrl(resource)
  if (isPublicUrl(resourceUrl)) {
    if (resource.type === 'pdf') {
      content.push({ type: 'file', file: { filename: resource.fileName || 'resource.pdf', file_data: resourceUrl } })
    } else if (resource.type === 'image') {
      content.push({ type: 'image_url', image_url: { url: resourceUrl } })
    } else if (resource.type === 'youtube') {
      content.push({ type: 'video_url', video_url: { url: resourceUrl } })
    }
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://irz.atifhasan.com',
      'X-Title': 'IT Resource Zone',
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: 'system', content: systemInstruction() },
        { role: 'user', content },
      ],
      temperature: 0.2,
      max_tokens: 700,
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error?.message || 'OpenRouter request failed')

  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenRouter returned an empty answer')
  return { answer: text, provider: provider.name, model: provider.model }
}
