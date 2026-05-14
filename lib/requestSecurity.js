import { NextResponse } from 'next/server'

export function enforceSameOrigin(request) {
  const origin = request.headers.get('origin')
  if (!origin) return null

  const requestOrigin = new URL(request.url).origin
  if (origin === requestOrigin) return null

  return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
}
