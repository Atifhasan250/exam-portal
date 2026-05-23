import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const ADMIN_COOKIE_NAME = 'irz_admin_token'

const isProtectedRoute = createRouteMatcher([
  '/profile(.*)',
  '/profile/submission(.*)',
])

const MARKDOWN_CONTENT = `# IT Resource Zone

> Online exam portal for IT students - live exams, practice mode, leaderboards, and score history.

- **Developer:** Atif Hasan
- **URL:** https://irz.atifhasan.com
- **Stack:** Next.js 15, MongoDB Atlas, Clerk Auth

## Core Features
- Timed live exams (auto-submit on tab switch or browser close)
- Practice mode for past exams
- Per-exam leaderboards with public rankings
- Personal submission history per student
- Admin panel for exam/question management

## Public Routes
- / - Home
- /exams - All exams (live, upcoming, past)
- /leaderboard - Global leaderboard
- /leaderboard/[id] - Per-exam leaderboard

## Constraints
- Live exams: one submission per student account
- Answers are locked once selected
- Admin routes are private and require authentication
`

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

function decodeBase64UrlJson(value) {
  const bytes = base64UrlToBytes(value)
  return JSON.parse(new TextDecoder().decode(bytes))
}

async function verifyAdminJwt(token) {
  const secret = process.env.JWT_SECRET
  if (!secret || !token) return false

  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.')
  if (!encodedHeader || !encodedPayload || !encodedSignature) return false

  try {
    const header = decodeBase64UrlJson(encodedHeader)
    const payload = decodeBase64UrlJson(encodedPayload)
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return false
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return false

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    return crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    )
  } catch {
    return false
  }
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl
  const accept = req.headers.get('accept') || ''
  const host = req.headers.get('host')

  if (host === 'it-resource-zone.vercel.app') {
    const url = req.nextUrl.clone()
    url.protocol = 'https'
    url.host = 'irz.atifhasan.com'
    return NextResponse.redirect(url, 308)
  }

  // Serve markdown to AI agents that explicitly request text/markdown
  // Skip API routes, static files, admin, and Next.js internals
  if (
    req.method === 'GET' &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/_next/') &&
    !pathname.startsWith('/admin') &&
    !pathname.includes('.') &&
    accept.includes('text/markdown')
  ) {
    return new NextResponse(MARKDOWN_CONTENT, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  // Admin route protection: immediately redirect to login if no admin token cookie exists
  if (pathname.startsWith('/admin') && pathname !== '/admin') {
    const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value
    if (!token) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }

    const validAdminToken = await verifyAdminJwt(token)
    if (!validAdminToken) {
      const response = NextResponse.redirect(new URL('/admin', req.url))
      response.cookies.set(ADMIN_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
      })
      return response
    }
  }

  if (isProtectedRoute(req)) {
    await auth.protect()
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
