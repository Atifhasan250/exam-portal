import { Redis } from '@upstash/redis'
import { createHash } from 'node:crypto'
import { logger } from '@/lib/logger'

const AI_PREFIX = 'irz:ai:v7'
const AI_QUOTA_PREFIX = 'irz:ai:quota:v1'
const LEGACY_AI_PREFIXES = ['irz:ai:v1', 'irz:ai:v2', 'irz:ai:v3', 'irz:ai:v4', 'irz:ai:v5']
const globalForAi = globalThis
const memoryCache = new Map()
const memoryHistory = new Map()
const memoryQuota = new Map()
const memoryRateLimit = new Map()

export function getAiLimits() {
  return {
    dailyLimit: positiveInt(process.env.AI_CHAT_DAILY_LIMIT, 5),
    maxMessageChars: positiveInt(process.env.AI_CHAT_MAX_MESSAGE_CHARS, 50),
    maxOutputTokens: positiveInt(process.env.AI_CHAT_MAX_OUTPUT_TOKENS, 2200),
    cacheTtlSeconds: positiveInt(process.env.AI_CHAT_CACHE_TTL_SECONDS, 86400),
    historyTtlSeconds: positiveInt(process.env.AI_CHAT_HISTORY_TTL_SECONDS, 86400),
    userMinuteLimit: positiveInt(process.env.AI_CHAT_USER_MINUTE_LIMIT, 2),
    providerRpmLimit: positiveInt(process.env.AI_CHAT_PROVIDER_RPM_LIMIT, 15),
    retryAttempts: positiveInt(process.env.AI_CHAT_RETRY_ATTEMPTS, 3),
    retryBaseDelayMs: positiveInt(process.env.AI_CHAT_RETRY_BASE_DELAY_MS, 1000),
  }
}

export function normalizeAiMessage(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

export function isAiContinuationPrompt(value) {
  const message = normalizeAiMessage(value).toLowerCase()
  if (!message) return false
  const compact = message.replace(/[.!?।,\s]+/g, ' ').trim()
  return [
    'continue',
    'continue please',
    'go on',
    'keep going',
    'more',
    'next',
    'aro',
    'aro bolo',
    'aro bolen',
    'aro dao',
    'aro likho',
    'continue koro',
    'chaliye jao',
    'চালিয়ে যাও',
    'চালিয়ে যাও',
    'আরো বলো',
    'আরও বলো',
    'আরো দাও',
    'আরও দাও',
    'পরের অংশ',
    'বাকি অংশ',
  ].includes(compact)
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
    const existing = Number(await redis.get(key)) || 0
    if (existing <= 0) {
      const legacyUsed = await getLegacyDailyUsage(userId)
      if (legacyUsed > 0) await redis.set(key, legacyUsed, { ex: secondsUntilReset() })
    }
    used = Number(await redis.incr(key)) || 1
    if (used === 1) await redis.expire(key, secondsUntilReset())
  } else {
    const now = Date.now()
    const entry = memoryQuota.get(key)
    if (!entry || entry.expiresAt <= now) {
      used = (await getLegacyDailyUsage(userId)) + 1
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

export async function reserveAiUsage(userId) {
  const { dailyLimit } = getAiLimits()
  const redis = getAiRedisClient()
  const key = quotaKey(userId)
  let used

  if (redis) {
    const existing = Number(await redis.get(key)) || 0
    if (existing <= 0) {
      const legacyUsed = await getLegacyDailyUsage(userId)
      if (legacyUsed > 0) await redis.set(key, legacyUsed, { ex: secondsUntilReset() })
    }
    used = Number(await redis.incr(key)) || 1
    if (used === 1) await redis.expire(key, secondsUntilReset())
  } else {
    const now = Date.now()
    const entry = memoryQuota.get(key)
    if (!entry || entry.expiresAt <= now) {
      used = (await getLegacyDailyUsage(userId)) + 1
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
    allowed: used <= dailyLimit,
  }
}

export async function refundAiUsage(userId) {
  const { dailyLimit } = getAiLimits()
  const redis = getAiRedisClient()
  const key = quotaKey(userId)
  let used

  if (redis) {
    used = Math.max(0, Number(await redis.decr(key)) || 0)
    if (used <= 0) {
      await redis.del(key)
      used = 0
    }
  } else {
    const entry = memoryQuota.get(key)
    if (!entry || entry.expiresAt <= Date.now()) {
      memoryQuota.delete(key)
      used = 0
    } else {
      used = Math.max(0, Number(entry.used) - 1)
      if (used <= 0) {
        memoryQuota.delete(key)
      } else {
        entry.used = used
      }
    }
  }

  return {
    limit: dailyLimit,
    used,
    remaining: Math.max(0, dailyLimit - used),
    resetAt: getAiResetAt(),
  }
}

export async function ensureAiUsageAtLeast(userId, minimumUsed) {
  const minUsed = Math.max(0, Math.trunc(Number(minimumUsed) || 0))
  if (minUsed <= 0) return getAiQuota(userId)

  const { dailyLimit } = getAiLimits()
  const redis = getAiRedisClient()
  const key = quotaKey(userId)
  let used

  if (redis) {
    const current = Math.max(0, Number(await redis.get(key)) || 0)
    used = Math.max(current, minUsed)
    if (used > current) await redis.set(key, used, { ex: secondsUntilReset() })
  } else {
    const now = Date.now()
    const entry = memoryQuota.get(key)
    const current = entry && entry.expiresAt > now ? Math.max(0, Number(entry.used) || 0) : 0
    used = Math.max(current, minUsed)
    memoryQuota.set(key, { used, expiresAt: now + secondsUntilReset() * 1000 })
  }

  return {
    limit: dailyLimit,
    used,
    remaining: Math.max(0, dailyLimit - used),
    resetAt: getAiResetAt(),
  }
}

export async function enforceAiUserMinuteLimit(userId) {
  const { userMinuteLimit } = getAiLimits()
  const key = userMinuteKey(userId)
  const used = await incrementWindowCounter(key, 70)

  return {
    limit: userMinuteLimit,
    used,
    remaining: Math.max(0, userMinuteLimit - used),
    allowed: used <= userMinuteLimit,
  }
}

export async function getCachedAiAnswer(resourceId, message) {
  const key = responseCacheKey(resourceId, message)
  const redis = getAiCacheRedisClient()

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
  const redis = getAiCacheRedisClient()

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

export async function getAiChatHistory(userId, resourceId) {
  const key = historyKey(userId, resourceId)
  const redis = getAiCacheRedisClient()

  try {
    if (redis) {
      const value = await redis.get(key)
      if (!value) return []
      const parsed = typeof value === 'string' ? JSON.parse(value) : value
      return sanitizeHistory(parsed)
    }

    const entry = memoryHistory.get(key)
    if (!entry || entry.expiresAt <= Date.now()) {
      memoryHistory.delete(key)
      return []
    }
    return sanitizeHistory(entry.value)
  } catch (error) {
    logger.warn('[resource-ai] history read failed', { error })
    return []
  }
}

export async function appendAiChatHistory(userId, resourceId, newMessages) {
  const key = historyKey(userId, resourceId)
  const existing = await getAiChatHistory(userId, resourceId)
  const messages = sanitizeHistory([...existing, ...newMessages]).slice(-40)

  return setAiChatHistory(key, messages)
}

export async function mergeAiContinuationHistory(userId, resourceId, assistantText) {
  const key = historyKey(userId, resourceId)
  const messages = await getAiChatHistory(userId, resourceId)
  const now = new Date().toISOString()
  const lastAssistantIndex = messages.map((message) => message.role).lastIndexOf('assistant')

  if (lastAssistantIndex >= 0) {
    messages[lastAssistantIndex] = {
      ...messages[lastAssistantIndex],
      text: `${messages[lastAssistantIndex].text}\n\n${normalizeHistoryText(assistantText)}`.trim(),
      createdAt: now,
    }
  } else {
    messages.push({ role: 'assistant', text: normalizeHistoryText(assistantText), createdAt: now })
  }

  return setAiChatHistory(key, messages.slice(-40))
}

async function setAiChatHistory(key, messages) {
  const { historyTtlSeconds } = getAiLimits()
  const redis = getAiCacheRedisClient()

  try {
    if (redis) {
      await redis.set(key, JSON.stringify(messages), { ex: historyTtlSeconds })
      return messages
    }
    memoryHistory.set(key, {
      value: messages,
      expiresAt: Date.now() + historyTtlSeconds * 1000,
    })
  } catch (error) {
    logger.warn('[resource-ai] history write failed', { error })
  }

  return messages
}

export async function generateResourceAiAnswer(resource, message, history = []) {
  const geminiProviders = await getRoundRobinGeminiProviders()
  const providers = [
    ...geminiProviders,
    ...getOpenRouterProviders(),
  ].filter(Boolean)

  if (!providers.length) {
    throw new Error('AI_PROVIDER_NOT_CONFIGURED')
  }

  const errors = []
  for (const provider of providers) {
    try {
      if (provider.type === 'gemini') {
        return await callGemini(resource, message, provider, history)
      }
      return await callOpenRouter(resource, message, provider, history)
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

function getAiCacheRedisClient() {
  if (process.env.UPSTASH_REDIS_CACHE_REST_URL && process.env.UPSTASH_REDIS_CACHE_REST_TOKEN) {
    if (!globalForAi.irzAiCacheRedisClient) {
      globalForAi.irzAiCacheRedisClient = new Redis({
        url: process.env.UPSTASH_REDIS_CACHE_REST_URL,
        token: process.env.UPSTASH_REDIS_CACHE_REST_TOKEN,
        automaticDeserialization: false,
      })
    }

    return globalForAi.irzAiCacheRedisClient
  }

  return getAiRedisClient()
}

async function getDailyUsage(userId) {
  const key = quotaKey(userId)
  const redis = getAiRedisClient()

  if (redis) {
    const value = await redis.get(key)
    const used = Math.max(0, Number(value) || 0)
    if (used > 0) return used
    const legacyUsed = await getLegacyDailyUsage(userId)
    if (legacyUsed > 0) await redis.set(key, legacyUsed, { ex: secondsUntilReset() })
    return legacyUsed
  }

  const entry = memoryQuota.get(key)
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryQuota.delete(key)
    return getLegacyDailyUsage(userId)
  }
  return Math.max(0, Number(entry.used) || 0)
}

function quotaKey(userId) {
  return `${AI_QUOTA_PREFIX}:${getAiDayKey()}:${hash(userId)}`
}

function userMinuteKey(userId) {
  return `${AI_QUOTA_PREFIX}:user-minute:${minuteBucket()}:${hash(userId)}`
}

function providerMinuteKey(provider) {
  return `${AI_QUOTA_PREFIX}:provider-minute:${minuteBucket()}:${hash(provider.rateKey || provider.name)}`
}

function geminiRoundRobinKey() {
  return `${AI_QUOTA_PREFIX}:gemini-round-robin`
}

async function getRoundRobinGeminiProviders() {
  const providers = getGeminiProviders()
  if (providers.length <= 1) return providers

  const counter = await incrementRoundRobinCounter(geminiRoundRobinKey())
  const startIndex = (counter - 1) % providers.length
  return [...providers.slice(startIndex), ...providers.slice(0, startIndex)]
}

async function incrementRoundRobinCounter(key) {
  const redis = getAiRedisClient()
  if (redis) return Number(await redis.incr(key)) || 1

  const value = (globalForAi.irzAiGeminiRoundRobinCounter || 0) + 1
  globalForAi.irzAiGeminiRoundRobinCounter = value
  return value
}

function minuteBucket(date = new Date()) {
  return Math.floor(date.getTime() / 60000)
}

async function incrementWindowCounter(key, ttlSeconds) {
  const redis = getAiRedisClient()

  if (redis) {
    const used = Number(await redis.incr(key)) || 1
    if (used === 1) await redis.expire(key, ttlSeconds)
    return used
  }

  const now = Date.now()
  const entry = memoryRateLimit.get(key)
  if (!entry || entry.expiresAt <= now) {
    memoryRateLimit.set(key, { used: 1, expiresAt: now + ttlSeconds * 1000 })
    return 1
  }
  entry.used += 1
  return entry.used
}

async function getLegacyDailyUsage(userId) {
  const redis = getAiRedisClient()
  const keys = legacyQuotaKeys(userId)

  if (redis) {
    const values = await Promise.all(keys.map((key) => redis.get(key)))
    return values.reduce((total, value) => total + Math.max(0, Number(value) || 0), 0)
  }

  const now = Date.now()
  return keys.reduce((total, key) => {
    const entry = memoryQuota.get(key)
    if (!entry || entry.expiresAt <= now) return total
    return total + Math.max(0, Number(entry.used) || 0)
  }, 0)
}

function legacyQuotaKeys(userId) {
  const day = getAiDayKey()
  const userHash = hash(userId)
  return LEGACY_AI_PREFIXES.map((prefix) => `${prefix}:quota:${day}:${userHash}`)
}

function responseCacheKey(resourceId, message) {
  return `${AI_PREFIX}:answer:${hash(resourceId)}:${hash(normalizeAiMessage(message).toLowerCase())}`
}

function historyKey(userId, resourceId) {
  return `${AI_PREFIX}:history:${hash(userId)}:${hash(resourceId)}`
}

function sanitizeHistory(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((message) => ({
      role: message?.role === 'user' ? 'user' : 'assistant',
      text: normalizeHistoryText(message?.text),
      createdAt: message?.createdAt || new Date().toISOString(),
      billable: message?.role === 'user' ? message?.billable !== false : false,
    }))
    .filter((message) => message.text)
    .slice(-40)
}

function normalizeHistoryText(value) {
  return String(value || '').split(String.fromCharCode(0)).join('').trim().slice(0, 8000)
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

function getGeminiProviders() {
  const indexed = [1, 2, 3, 4, 5].map((index) => {
    const apiKey = process.env[`GEMINI_API_KEY_${index}`]
    if (!apiKey) return null
    return {
      type: 'gemini',
      name: `gemini-${index}`,
      rateKey: `gemini-${index}`,
      apiKey,
      model: process.env[`GEMINI_MODEL_${index}`] || process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    }
  }).filter(Boolean)

  if (indexed.length) return indexed
  if (!process.env.GEMINI_API_KEY) return []
  return [{
    type: 'gemini',
    name: 'gemini-legacy',
    rateKey: 'gemini-legacy',
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  }]
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
    'Always behave respectfully, warmly, and patiently. Be friendly but not over-casual.',
    'Always use Islamic greeting style in Bangla when greeting: start with "আসসালামু আলাইকুম" if a greeting is needed. Never use "নমস্কার" or similar greetings.',
    'সব উত্তর অবশ্যই বাংলা ভাষায় দেবে, user English/Banglish/Bangla যাই লিখুক।',
    'Strict scope rule: answer only using the current resource context and the user question. Do not answer general questions, unrelated coding questions, personal questions, news, or anything outside this resource.',
    'If the user asks outside the resource context, politely say in Bangla that you can only help with this specific resource, then invite them to ask a question about this resource.',
    'শুধু দেওয়া resource context থেকে উত্তর দেবে। resource থেকে নিশ্চিত তথ্য না পেলে পরিষ্কারভাবে বলবে যে এই resource-এ যথেষ্ট তথ্য নেই।',
    'Do not invent facts, links, timestamps, examples, or explanations that are not supported by the resource context.',
    'উত্তর ছোট, সহজ, student-friendly এবং practical রাখবে।',
    'Always structure answers clearly using bullet points or numbered points. If the answer is long, split it into short paragraphs or small titled sections so it is easy to scan.',
    'Finish the answer completely. If the answer would become too long, give the most important complete points instead of ending mid-sentence.',
    'উত্তরে Markdown formatting ব্যবহার করতে পারবে: **bold**, *italic*, bullet/numbered list. Code লিখলে অবশ্যই fenced code block ব্যবহার করবে, যেমন ```c ... ```.',
    'When showing a program, command, or multi-line code example, never use inline backticks. Always put the full code in one fenced code block with the language name. Use inline backticks only for very short identifiers such as function names or file extensions.',
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

function buildConversationTextContext(history) {
  const recent = sanitizeHistory(history).slice(-8)
  if (!recent.length) return ''

  return [
    'Recent chat context for this same resource:',
    ...recent.map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.text}`),
  ].join('\n')
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

async function callGemini(resource, message, provider, history = []) {
  const { maxOutputTokens, providerRpmLimit, retryAttempts, retryBaseDelayMs } = getAiLimits()
  const providerUsage = await incrementWindowCounter(providerMinuteKey(provider), 70)
  if (providerUsage > providerRpmLimit) {
    throw new Error(`Gemini RPM limit reached for ${provider.name}`)
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(provider.apiKey)}`
  const conversationContext = buildConversationTextContext(history)
  const userParts = [
    { text: `${buildResourceTextContext(resource)}${conversationContext ? `\n\n${conversationContext}` : ''}\n\nUser question: ${message}` },
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

  const payload = {
    systemInstruction: { parts: [{ text: systemInstruction() }] },
    contents: [{ role: 'user', parts: userParts }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens,
    },
  }

  let data = {}
  let lastError = null
  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    data = await response.json().catch(() => ({}))
    if (response.ok) {
      lastError = null
      break
    }

    const messageText = data?.error?.message || 'Gemini request failed'
    lastError = new Error(messageText)
    if (!isRetryableProviderStatus(response.status) || attempt >= retryAttempts) break
    await sleep(retryBaseDelayMs * (2 ** (attempt - 1)))
  }

  if (lastError) throw lastError

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join('\n')
    .trim()
  if (!text) throw new Error('Gemini returned an empty answer')
  return { answer: text, provider: provider.name, model: provider.model }
}

function isRetryableProviderStatus(status) {
  return status === 429 || status >= 500
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callOpenRouter(resource, message, provider, history = []) {
  const { maxOutputTokens } = getAiLimits()
  const conversationContext = buildConversationTextContext(history)
  const content = [
    { type: 'text', text: `${buildResourceTextContext(resource)}${conversationContext ? `\n\n${conversationContext}` : ''}\n\nUser question: ${message}` },
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
      max_tokens: maxOutputTokens,
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error?.message || 'OpenRouter request failed')

  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenRouter returned an empty answer')
  return { answer: text, provider: provider.name, model: provider.model }
}
