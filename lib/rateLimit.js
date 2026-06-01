/**
 * Rate limiter — uses Upstash Redis when env vars are configured (production),
 * falls back to an in-memory map for local development or when Upstash is not set up.
 *
 * NOTE: The in-memory fallback resets on every serverless cold start and provides
 * near-zero protection in production. Configure UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN in your Vercel environment variables to enable
 * persistent, cross-instance rate limiting.
 *
 * Setup: https://upstash.com → create a Redis database → copy REST URL + token
 */

import { NextResponse } from 'next/server'
import { getTrustedClientIp } from '@/lib/requestSecurity'

const upstashLimiterCache = new Map()

// ── Upstash path (production) ────────────────────────────────────────────────

async function getUpstashLimiter(name, windowMs, max) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }

  const cacheKey = `${name}:${windowMs}:${max}`
  if (upstashLimiterCache.has(cacheKey)) {
    return upstashLimiterCache.get(cacheKey)
  }

  try {
    const { Redis } = await import('@upstash/redis')
    const { Ratelimit } = await import('@upstash/ratelimit')

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, `${Math.round(windowMs / 1000)} s`),
      prefix: `rl:${name}`,
    })
    upstashLimiterCache.set(cacheKey, limiter)
    return limiter
  } catch {
    upstashLimiterCache.delete(cacheKey)
    return null
  }
}

// ── In-memory fallback (local dev / no Upstash configured) ──────────────────

const stores = new Map()

function getStore(name) {
  if (!stores.has(name)) stores.set(name, new Map())
  return stores.get(name)
}

function inMemoryRateLimit(name, ip, keyParts, windowMs, max, message) {
  const store = getStore(name)
  const key = `${name}:${ip}:${keyParts.join(':')}`
  const now = Date.now()

  // Clean expired entries
  for (const [k, entry] of store.entries()) {
    if (entry.expiresAt <= now) store.delete(k)
  }

  const entry = store.get(key)
  if (!entry || entry.expiresAt <= now) {
    store.set(key, { count: 1, expiresAt: now + windowMs })
    return null
  }

  if (entry.count >= max) {
    return new NextResponse(JSON.stringify({ error: message }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil((entry.expiresAt - now) / 1000)),
      },
    })
  }

  entry.count += 1
  return null
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function rateLimit(request, options) {
  const {
    name,
    windowMs,
    max,
    keyParts = [],
    message = 'Too many requests.',
    requirePersistent = false,
  } = options

  const ip = getTrustedClientIp(request)
  const identifier = `${ip}:${keyParts.join(':')}`

  if (
    requirePersistent &&
    process.env.NODE_ENV === 'production' &&
    (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)
  ) {
    return new NextResponse(
      JSON.stringify({ error: 'Persistent rate limiting is not configured.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Try Upstash first
  const limiter = await getUpstashLimiter(name, windowMs, max)
  if (limiter) {
    try {
      const { success, reset } = await limiter.limit(identifier)
      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000)
        return new NextResponse(JSON.stringify({ error: message }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        })
      }
      return null
    } catch {
      // If Upstash call fails, fall through to in-memory
    }
  }

  // Fall back to in-memory
  return inMemoryRateLimit(name, ip, keyParts, windowMs, max, message)
}

export async function adminMutationRateLimit(request, options = {}) {
  return rateLimit(request, {
    name: options.name || 'admin-mutation',
    windowMs: options.windowMs || 60 * 1000,
    max: options.max || 40,
    keyParts: options.keyParts || [],
    message: options.message || 'Too many admin changes. Try again shortly.',
    requirePersistent: options.requirePersistent ?? true,
  })
}

export async function userMutationRateLimit(request, options = {}) {
  return rateLimit(request, {
    name: options.name || 'user-mutation',
    windowMs: options.windowMs || 60 * 1000,
    max: options.max || 30,
    keyParts: options.keyParts || [],
    message: options.message || 'Too many changes. Try again shortly.',
    requirePersistent: options.requirePersistent ?? false,
  })
}
