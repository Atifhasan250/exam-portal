import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/profile(.*)',
  '/profile/submission(.*)',
])

const isClerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.CLERK_SECRET_KEY,
)

const MARKDOWN_CONTENT = `# IT Resource Zone

> Online exam portal for IT students — live exams, practice mode, leaderboards, and score history.

- **Developer:** Atif Hasan
- **URL:** https://it-resource-zone.vercel.app
- **Stack:** Next.js 15, MongoDB Atlas, Clerk Auth

## Core Features
- Timed live exams (auto-submit on tab switch or browser close)
- Practice mode for past exams
- Per-exam leaderboards with public rankings
- Personal submission history per student
- Admin panel for exam/question management

## Public Routes
- / — Home
- /exams — All exams (live, upcoming, past)
- /leaderboard — Global leaderboard
- /leaderboard/[id] — Per-exam leaderboard

## Constraints
- Live exams: one submission per student account
- Answers are locked once selected
- Admin routes are private and require authentication
`

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl
  const accept = req.headers.get('accept') || ''

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
    if (!req.cookies.has('irz_admin_token')) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
  }

  if (!isClerkEnabled) {
    return NextResponse.next()
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
