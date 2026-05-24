import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'

const CACHE_PREFIX = 'irz:cache:v1'
const globalForRedisCache = globalThis

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
