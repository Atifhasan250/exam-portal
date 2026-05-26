import { Redis } from '@upstash/redis'
import { createHash } from 'node:crypto'
import { logger } from '@/lib/logger'

const CACHE_PREFIX_BASE = 'irz:cache:v2'
const globalForRedisCache = globalThis

function shortHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 12)
}

function normalizeNamespace(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getCacheNamespace() {
  const explicitNamespace = normalizeNamespace(
    process.env.CACHE_NAMESPACE ||
    process.env.REDIS_CACHE_NAMESPACE ||
    process.env.UPSTASH_REDIS_CACHE_NAMESPACE,
  )
  if (explicitNamespace) return explicitNamespace

  const environment = normalizeNamespace(process.env.VERCEL_ENV || process.env.NODE_ENV || 'local')
  const databaseScope = process.env.MONGO_URI ? `mongo-${shortHash(process.env.MONGO_URI)}` : 'mongo-none'

  return `${environment}:${databaseScope}`
}

const CACHE_PREFIX = `${CACHE_PREFIX_BASE}:${getCacheNamespace()}`

function isRedisConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

function getRedisClient() {
  if (!isRedisConfigured()) return null

  if (!globalForRedisCache.irzRedisCacheClient) {
    globalForRedisCache.irzRedisCacheClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      automaticDeserialization: false,
    })
  }

  return globalForRedisCache.irzRedisCacheClient
}

function withPrefix(key) {
  return `${CACHE_PREFIX}:${key}`
}

function parseCachedValue(value) {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string') return JSON.parse(value)
  return value
}

export async function getCachedJson(key, loader, ttlSeconds) {
  const redis = getRedisClient()
  if (!redis || !ttlSeconds || ttlSeconds <= 0) return loader()

  const cacheKey = withPrefix(key)

  try {
    const cached = parseCachedValue(await redis.get(cacheKey))
    if (cached !== undefined) return cached
  } catch (error) {
    logger.warn('[redis-cache] read failed', { key, error })
  }

  const data = await loader()
  if (data === undefined) return data

  try {
    await redis.set(cacheKey, JSON.stringify(data), { ex: ttlSeconds })
  } catch (error) {
    logger.warn('[redis-cache] write failed', { key, error })
  }

  return data
}

export async function getCacheVersion(key) {
  const redis = getRedisClient()
  if (!redis) return 'local'

  try {
    const version = await redis.get(withPrefix(`version:${key}`))
    return version ? String(version) : '1'
  } catch (error) {
    logger.warn('[redis-cache] version read failed', { key, error })
    return 'local'
  }
}

export async function incrementCacheVersion(key) {
  const redis = getRedisClient()
  if (!redis) return

  try {
    await redis.incr(withPrefix(`version:${key}`))
  } catch (error) {
    logger.warn('[redis-cache] version increment failed', { key, error })
  }
}

export async function deleteCacheKeys(keys) {
  const redis = getRedisClient()
  if (!redis) return

  const requestedKeys = Array.isArray(keys) ? keys : [keys]
  const resolvedKeys = []

  try {
    for (const key of requestedKeys.filter(Boolean)) {
      const prefixed = withPrefix(key)
      if (prefixed.includes('*')) {
        let cursor = '0'
        do {
          const [nextCursor, matches] = await redis.scan(cursor, { match: prefixed, count: 500 })
          resolvedKeys.push(...matches)
          cursor = nextCursor
        } while (cursor !== '0')
      } else {
        resolvedKeys.push(prefixed)
      }
    }

    const uniqueKeys = [...new Set(resolvedKeys)]
    if (uniqueKeys.length) await redis.del(...uniqueKeys)
  } catch (error) {
    logger.warn('[redis-cache] delete failed', { keys: requestedKeys, error })
  }
}
