import { NextResponse } from 'next/server'

export function enforceSameOrigin(request) {
  const origin = request.headers.get('origin')
  if (!origin) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Missing request origin' }, { status: 403 })
    }
    return null
  }

  const requestOrigin = new URL(request.url).origin
  if (origin === requestOrigin) return null

  return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
}
