const stores = new Map()

function getStore(name) {
  if (!stores.has(name)) {
    stores.set(name, new Map())
  }
  return stores.get(name)
}

export async function rateLimit(request, options) {
  const {
    name,
    windowMs,
    max,
    message = 'Too many requests.',
  } = options

  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() || 'local'
  const key = `${name}:${ip}`
  const now = Date.now()
  const store = getStore(name)
  const entry = store.get(key)

  if (!entry || entry.expiresAt <= now) {
    store.set(key, { count: 1, expiresAt: now + windowMs })
    return null
  }

  if (entry.count >= max) {
    return new Response(JSON.stringify({ error: message }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  entry.count += 1
  return null
}
