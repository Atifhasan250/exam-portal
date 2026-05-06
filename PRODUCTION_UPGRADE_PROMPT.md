# IT Resource Zone — Full Production Upgrade Guide for AI Agent

> **Context**: This is a React 19 + Express 4 + MongoDB exam portal currently running on Vercel free tier. It has ~20–30 users, no student auth (localStorage identity), and a JWT-protected admin area. The goal of this guide is a complete migration to Next.js 14 (App Router) with Clerk authentication for students and admins, full database-backed user state, production-quality security, performance, and polished UI — all within Vercel free tier constraints.
>
> **Agent instructions**: Apply ALL sections in the priority order defined in Section 11. Do not skip any section. Do not hallucinate features or invent new ones. Every fix listed here is derived directly from the existing codebase. When a fix references a specific file and line pattern, match it exactly. If a step has multiple sub-tasks, complete all of them before moving on. After completing each major section, verify the app still compiles and runs before continuing.

---

## TABLE OF CONTENTS

1. [Framework Migration — React+Express to Next.js 14](#section-1)
2. [Authentication — Clerk Integration](#section-2)
3. [Database Schema Changes](#section-3)
4. [Security Fixes](#section-4)
5. [Performance Optimizations](#section-5)
6. [UI/UX Fixes and Improvements](#section-6)
7. [Animations and Loading States](#section-7)
8. [Admin Panel Improvements](#section-8)
9. [Deployment and Environment](#section-9)
10. [Color Palette and Design Tokens](#section-10)
11. [Priority Order for Agent](#section-11)
12. [Notes for Agent](#section-12)

---

## SECTION 1 — Framework Migration: React + Express → Next.js 14 (App Router) {#section-1}

### Why Migrate

The current setup is a Vite SPA + Express API deployed as Vercel serverless functions. This causes two problems: (a) cold starts hit every time the serverless function wakes up because Express boots from scratch, and (b) there is no server-side rendering, so every page load is a blank HTML shell waiting for JS to hydrate. Next.js App Router eliminates both issues by colocating the API as Route Handlers (same cold-start context as the page), enabling React Server Components for instant data fetching on the server, and streaming HTML to the browser before JS is ready.

### 1.1 — Project Setup

Create a new Next.js 14 project with the App Router. Do not use the Pages Router.

```bash
npx create-next-app@latest exam-portal --app --typescript=false --tailwind=false --eslint --src-dir=false --import-alias="@/*"
cd exam-portal
npm install mongoose jsonwebtoken express-rate-limit dompurify papaparse @clerk/nextjs
npm install -D tailwindcss postcss autoprefixer
```

Tailwind is installed as a proper PostCSS plugin in Next.js (not via CDN). Do not use the CDN script tag. Move the Tailwind config and custom CSS variables from `index.html` and `src/index.css` into the new project's `globals.css` and `tailwind.config.js`.

**`tailwind.config.js`**:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        theme: {
          bg:             'var(--color-bg)',
          surface:        'var(--color-surface)',
          primary:        'var(--color-primary)',
          secondary:      'var(--color-secondary)',
          accent:         'var(--color-accent)',
          border:         'var(--color-border)',
          'error-bg':     'var(--color-error-bg)',
          'error-text':   'var(--color-error-text)',
          'error-border': 'var(--color-error-border)',
          'success-bg':   'var(--color-success-bg)',
          'success-text': 'var(--color-success-text)',
          'success-border':'var(--color-success-border)',
        }
      }
    }
  },
  plugins: []
}
```

Font Awesome is loaded via CDN in the root layout's `<head>`, same as before.

### 1.2 — Directory Structure

The new project structure:

```
/exam-portal
├── app/
│   ├── layout.jsx              ← Root layout: ThemeProvider, ClerkProvider, fonts
│   ├── globals.css             ← All CSS variables, animations, utilities
│   ├── page.jsx                ← HomePage (Server Component)
│   ├── exams/
│   │   └── page.jsx            ← ExamsPage (Client Component — needs state)
│   ├── exam/
│   │   └── [id]/
│   │       └── page.jsx        ← ExamPage (Client Component)
│   ├── leaderboard/
│   │   ├── page.jsx            ← Leaderboard index (Server Component)
│   │   └── [id]/
│   │       └── page.jsx        ← Single exam leaderboard
│   ├── profile/
│   │   ├── page.jsx            ← ProfilePage (Server Component, Clerk protected)
│   │   └── submission/
│   │       └── [id]/
│   │           └── page.jsx    ← SubmissionDetails
│   ├── sign-in/
│   │   └── [[...sign-in]]/
│   │       └── page.jsx        ← Clerk sign-in, custom styled
│   ├── sign-up/
│   │   └── [[...sign-up]]/
│   │       └── page.jsx        ← Clerk sign-up, custom styled
│   ├── admin/
│   │   ├── layout.jsx          ← Admin layout with auth check
│   │   ├── page.jsx            ← AdminLogin (redirect to dashboard if authed)
│   │   └── dashboard/
│   │       ├── page.jsx        ← AdminDashboard
│   │       └── exam/
│   │           └── [id]/
│   │               └── page.jsx ← AdminExamView
│   └── api/
│       ├── exams/
│       │   ├── route.js        ← GET all exams, POST create exam
│       │   └── [id]/
│       │       ├── route.js    ← GET, PUT, DELETE single exam
│       │       ├── publish/
│       │       │   └── route.js
│       │       ├── questions/
│       │       │   ├── route.js
│       │       │   └── [qIdx]/
│       │       │       └── route.js
│       │       ├── submit/
│       │       │   └── route.js
│       │       └── leaderboard/
│       │           └── route.js
│       ├── leaderboard/
│       │   └── route.js
│       ├── submissions/
│       │   ├── name/
│       │   │   └── route.js
│       │   ├── [name]/
│       │   │   └── route.js
│       │   └── details/
│       │       └── [id]/
│       │           └── route.js
│       └── admin/
│           └── login/
│               └── route.js
├── components/
│   ├── BottomNav.jsx
│   ├── Navbar.jsx
│   └── ThemeProvider.jsx
├── context/
│   └── ThemeContext.jsx
├── lib/
│   ├── db.js
│   ├── auth.js                 ← Admin JWT helpers + Clerk helpers
│   └── models/
│       ├── Exam.js
│       ├── Question.js
│       └── Submission.js
├── utils/
│   ├── parseQuestions.js
│   └── sanitize.js
├── public/
│   ├── favicon.png
│   ├── robots.txt
│   └── sitemap.xml
├── middleware.js               ← Clerk middleware for route protection
├── next.config.js
├── tailwind.config.js
├── .env.local                  ← All env vars
└── package.json
```

### 1.3 — Route Handlers (API)

All Express routes from `api/index.js` are migrated to Next.js Route Handlers. Each handler lives in its own `route.js` file under `app/api/`. The logic inside each handler is identical to the current Express handlers, only the signature changes.

Express route signature:
```js
app.get('/api/exams', async (req, res) => { ... })
```

Next.js Route Handler equivalent:
```js
// app/api/exams/route.js
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Exam from '@/lib/models/Exam'

export async function GET(request) {
  try {
    await connectDB()
    const exams = await Exam.find({ published: true }, { questions: 0 }).sort({ createdAt: -1 })
    return NextResponse.json(exams, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

Apply this pattern to ALL existing routes. The middleware for admin auth changes from Express middleware to a helper function called at the top of protected handlers:

```js
// lib/auth.js
import { headers } from 'next/headers'
import jwt from 'jsonwebtoken'

export function verifyAdminToken() {
  const headersList = headers()
  const auth = headersList.get('authorization')
  const token = auth?.split(' ')[1]
  if (!token) return null
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return null
  }
}
```

Usage in a protected route handler:
```js
export async function DELETE(request, { params }) {
  const admin = verifyAdminToken()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // ...
}
```

### 1.4 — Server Components for Fast Initial Load

Pages that only display data and do not need interactivity should be React Server Components. They fetch data directly on the server and return pre-rendered HTML — no loading spinner, no API call from the browser.

**Pages that should be Server Components** (fetch data server-side):
- `app/leaderboard/page.jsx` — fetch `/api/leaderboard` server-side
- `app/page.jsx` (HomePage) — static, no data needed

**Pages that must be Client Components** (use state, hooks, or browser APIs):
- `app/exams/page.jsx` — uses `useState`, timers
- `app/exam/[id]/page.jsx` — exam timer, answers state
- `app/profile/page.jsx` — can be partially server-rendered; submission list can be fetched server-side via Clerk user ID
- `app/leaderboard/[id]/page.jsx` — can be Server Component if no filtering state is needed client-side

For Server Components, data is fetched inline:
```jsx
// app/leaderboard/page.jsx — Server Component (no 'use client')
export default async function LeaderboardPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/leaderboard`, {
    next: { revalidate: 60 } // ISR: revalidate every 60 seconds
  })
  const data = await res.json()
  return <LeaderboardView data={data} />
}
```

This means the leaderboard page renders fully on the server with real data, delivers HTML instantly, and revalidates in the background. No cold-start spinner visible to the user.

### 1.5 — next.config.js

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for DOMPurify on the server (it's browser-only)
  // Import it only in client components
  experimental: {},
  // Ensure API routes don't timeout too fast on Vercel free tier
  serverRuntimeConfig: {},
  publicRuntimeConfig: {},
}
module.exports = nextConfig
```

DOMPurify is a browser-only library. Only import `safeHTML` from `utils/sanitize.js` inside Client Components (files with `'use client'` at the top). Never import it in Server Components or Route Handlers.

---

## SECTION 2 — Authentication: Clerk Integration {#section-2}

### Why Clerk

The current app has no student authentication — identity is a string in localStorage. This creates impersonation risks and means exam history is tied to a name string, not a real user. Clerk provides a complete auth solution with free tier (10,000 MAU), works natively with Next.js App Router, and handles OAuth, email/password, JWT sessions, and user management without a database schema for users.

### 2.1 — Clerk Setup

1. Create a free account at https://clerk.com
2. Create an application. Enable Email/Password sign-in. Optionally enable Google OAuth.
3. Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` into `.env.local`.
4. Set Clerk redirect URLs:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in URL: `/`
   - After sign-up URL: `/`

Add to `.env.local`:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### 2.2 — Middleware

Create `middleware.js` at the project root:

```js
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/profile(.*)',
  '/profile/submission(.*)',
])

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect()
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
```

The admin area is NOT Clerk-protected — it uses its own JWT system (keeping backward compat). Only student-facing protected pages use Clerk middleware.

### 2.3 — Root Layout with ClerkProvider

```jsx
// app/layout.jsx
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from '@/context/ThemeContext'
import './globals.css'

export const metadata = {
  title: 'IT Resource Zone – Free IT Exams & MCQ Practice Platform',
  description: 'IT Resource Zone is a free online platform for IT students...',
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <head>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        </head>
        <body>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
```

### 2.4 — Custom Sign-In Page

Create `app/sign-in/[[...sign-in]]/page.jsx`. This page uses Clerk's `<SignIn>` component but wraps it in the app's design system so it matches the color palette and styling exactly.

```jsx
'use client'
import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'

export default function SignInPage() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="bg-theme-bg min-h-screen flex items-center justify-center p-4 transition-theme">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link href="/">
            <img src="/favicon.png" alt="Logo" className="h-16 w-16 object-contain mx-auto mb-4" />
          </Link>
          <h1 className="text-2xl font-extrabold text-theme-primary">Welcome Back</h1>
          <p className="text-theme-secondary text-sm mt-1">Sign in to access your exam history</p>
        </div>

        {/* Clerk SignIn component with appearance prop for custom theming */}
        <SignIn
          appearance={{
            variables: {
              colorPrimary: 'var(--color-accent)',
              colorBackground: 'var(--color-surface)',
              colorText: 'var(--color-primary)',
              colorTextSecondary: 'var(--color-secondary)',
              colorInputBackground: 'var(--color-bg)',
              colorInputText: 'var(--color-primary)',
              borderRadius: '0.75rem',
            },
            elements: {
              rootBox: 'w-full',
              card: 'bg-theme-surface border border-theme-border rounded-2xl shadow-xl p-8',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              socialButtonsBlockButton: 'bg-theme-bg border border-theme-border text-theme-primary hover:border-theme-primary/40 rounded-xl font-semibold transition-all',
              formButtonPrimary: 'bg-theme-accent text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all',
              formFieldInput: 'bg-theme-bg border border-theme-border text-theme-primary rounded-xl focus:ring-2 focus:ring-theme-accent outline-none',
              formFieldLabel: 'text-theme-primary font-medium text-sm',
              footerActionLink: 'text-theme-accent font-bold hover:underline',
              dividerLine: 'bg-theme-border',
              dividerText: 'text-theme-secondary',
              identityPreviewText: 'text-theme-primary',
              identityPreviewEditButton: 'text-theme-accent',
              alertText: 'text-theme-error-text',
            }
          }}
        />

        {/* Theme toggle */}
        <div className="text-center">
          <button onClick={toggleTheme} className="text-theme-secondary hover:text-theme-primary text-sm transition-colors">
            <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} mr-2`}></i>
            Toggle Theme
          </button>
        </div>
      </div>
    </div>
  )
}
```

Create `app/sign-up/[[...sign-up]]/page.jsx` with the exact same structure but using the `<SignUp>` component instead. Change the header text to "Create Account" and the subtitle to "Join to track your exam scores".

### 2.5 — Replace localStorage Student Name with Clerk User

**Current behavior**: Student name is stored in `localStorage.student_name`. Submissions are queried by `studentName` string.

**New behavior**:
- On sign-up/sign-in via Clerk, the user's Clerk `userId` is the primary identity.
- The student's display name is Clerk's `user.fullName` or `user.firstName`.
- All submissions store both `studentName` (for display) and `clerkUserId` (for queries).
- The profile page queries submissions by `clerkUserId`, not by name.
- Name changes update `user.update({ firstName, lastName })` in Clerk, which propagates everywhere automatically.

**Submission model change** (see Section 3):
Add `clerkUserId: { type: String, index: true }` to `SubmissionSchema`.

**API changes**:
- `POST /api/exams/:id/submit`: Read `clerkUserId` from the request body. Also accept `studentName` as a display name. Store both in the submission document.
- `GET /api/submissions/:name` is deprecated. Replace with `GET /api/submissions/user/:clerkUserId` which queries by `clerkUserId` instead of name. Keep the old endpoint for backward compatibility only during transition.
- `PUT /api/submissions/name` still works for display name updates but also accepts an optional `clerkUserId` to scope the update.

**Frontend changes**:
In every Client Component that currently reads `localStorage.getItem('student_name')`, replace with Clerk's `useUser()` hook:

```jsx
'use client'
import { useUser } from '@clerk/nextjs'

export default function ExamsPage() {
  const { user, isLoaded } = useUser()
  const studentName = user?.fullName || user?.firstName || 'Anonymous'
  // ...
}
```

Do NOT store the Clerk user ID in localStorage. Read it from the Clerk session on every render.

**For unauthenticated exam submissions**: Students can still take exams without signing in, but their submission will have no `clerkUserId`. They will be shown a "Sign in to save your history" message after submitting. This preserves the frictionless experience while incentivizing sign-up.

### 2.6 — Navbar Updates

Replace the manual name display and edit button in `Navbar.jsx` with Clerk's `<UserButton>` component:

```jsx
import { UserButton, SignInButton, useUser } from '@clerk/nextjs'

export default function Navbar() {
  const { isSignedIn, user } = useUser()
  // ...
  return (
    <header>
      {/* ...existing header markup... */}
      <div className="flex items-center space-x-3">
        {/* theme toggle button */}
        {isSignedIn ? (
          <>
            <Link to="/profile">Profile</Link>
            <UserButton afterSignOutUrl="/" />
          </>
        ) : (
          <SignInButton mode="modal">
            <button className="px-3 py-2 rounded-xl text-sm font-medium bg-theme-accent text-white">
              Sign In
            </button>
          </SignInButton>
        )}
      </div>
    </header>
  )
}
```

The `student_name_changed` custom event system is fully removed. React state in BottomNav reads from `useUser()` directly.

### 2.7 — Admin Auth Stays As-Is (JWT)

The admin login (`POST /api/admin/login`) stays as a custom JWT system. Do NOT add Clerk to the admin area. The admin is a single user controlled by env vars. Clerk is only for students.

---

## SECTION 3 — Database Schema Changes {#section-3}

### 3.1 — Submission Model: Add clerkUserId

**File**: `lib/models/Submission.js`

Add `clerkUserId` field and update indexes:

```js
const SubmissionSchema = new mongoose.Schema({
  examId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentName: { type: String, required: true },
  clerkUserId: { type: String, default: null },   // ← ADD THIS
  score:       { type: Number, required: true },
  total:       { type: Number, required: true },
  wrong:       { type: Number, required: true },
  unanswered:  { type: Number, required: true },
  answers:     { type: mongoose.Schema.Types.Mixed },
  wasLive:     { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now }
})

SubmissionSchema.index({ examId: 1, wasLive: 1 })
SubmissionSchema.index({ studentName: 1, submittedAt: -1 })
SubmissionSchema.index({ examId: 1, studentName: 1 })
SubmissionSchema.index({ clerkUserId: 1, submittedAt: -1 })  // ← ADD THIS
SubmissionSchema.index({ examId: 1, clerkUserId: 1 })        // ← ADD THIS
```

No migration script needed. Existing submissions have `clerkUserId: null` and continue working by name. New submissions from signed-in users will have both fields populated.

### 3.2 — Submission: One-Attempt Enforcement

**Current problem**: The one-attempt-per-live-exam rule is enforced only in the browser via `localStorage.getItem('live_taken_${id}')`. A user can open a private window and submit a second time.

**Fix**: Enforce server-side in `POST /api/exams/:id/submit`:

```js
// In the submit route handler:
// If the user is signed in AND the exam is live, check for existing submission
if (clerkUserId && wasLive) {
  const existing = await Submission.findOne({ examId: exam._id, clerkUserId })
  if (existing) {
    return NextResponse.json({ error: 'You have already submitted this live exam.' }, { status: 409 })
  }
}
// If not signed in but name provided, fall back to name-based check (existing behavior)
else if (!clerkUserId && studentName !== 'Anonymous' && wasLive) {
  const existing = await Submission.findOne({ examId: exam._id, studentName })
  if (existing) {
    return NextResponse.json({ error: 'You have already submitted this live exam.' }, { status: 409 })
  }
}
```

### 3.3 — Profile Query by clerkUserId

Replace `GET /api/submissions/:name` with a new endpoint `GET /api/submissions/user/[clerkUserId]/route.js`:

```js
export async function GET(request, { params }) {
  // Verify the requesting Clerk user matches the userId in the URL
  // Use Clerk's getAuth(request) from @clerk/nextjs/server to get the session
  const { userId } = getAuth(request)
  if (!userId || userId !== params.clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const submissions = await Submission.find({ clerkUserId: params.clerkUserId })
    .populate('examId', 'title')
    .sort({ score: -1, submittedAt: -1 })

  // Deduplicate by exam (best score per exam)
  const uniqueSubmissions = []
  const seenExams = new Set()
  for (const sub of submissions) {
    const examIdStr = sub.examId?._id?.toString()
    if (examIdStr && !seenExams.has(examIdStr)) {
      seenExams.add(examIdStr)
      uniqueSubmissions.push(sub)
    }
  }

  return NextResponse.json(uniqueSubmissions)
}
```

---

## SECTION 4 — Security Fixes {#section-4}

### 4.1 — Rate Limiting (CRITICAL)

**Current state**: Rate limiting is already present in the current Express code (`express-rate-limit`). In Next.js Route Handlers, `express-rate-limit` does not work because there is no Express instance.

**Fix**: Use the `lru-cache` based approach for in-memory rate limiting in Next.js. Install:
```bash
npm install lru-cache
```

Create `lib/rateLimit.js`:
```js
import { LRUCache } from 'lru-cache'

const cache = new LRUCache({ max: 500, ttl: 60 * 1000 }) // 1 minute window

export function rateLimit({ limit = 60, windowMs = 60 * 1000, keyFn = null } = {}) {
  return (request) => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const key = keyFn ? keyFn(request) : ip
    const current = cache.get(key) || 0
    if (current >= limit) {
      return { limited: true, current }
    }
    cache.set(key, current + 1)
    return { limited: false, current: current + 1 }
  }
}
```

Apply rate limiting to every sensitive Route Handler:

| Route | Limit | Window |
|---|---|---|
| `POST /api/admin/login` | 10 requests | 15 minutes |
| `POST /api/exams/:id/submit` | 5 requests per IP per exam | 10 minutes |
| `PUT /api/submissions/name` | 20 requests | 15 minutes |
| All other API routes | 120 requests | 1 minute |

Usage in a route:
```js
const loginLimiter = rateLimit({ limit: 10, windowMs: 15 * 60 * 1000 })

export async function POST(request) {
  const { limited } = loginLimiter(request)
  if (limited) return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
  // ...
}
```

**Important Vercel caveat**: Because Vercel serverless functions may run on multiple instances, in-memory LRU caches do not share state across instances. This means the rate limit is per-instance, not global. For 20–50 users this is acceptable. If the app scales beyond 200 concurrent users, migrate to Redis (Upstash has a free tier) for distributed rate limiting. Document this limitation clearly in a comment in `lib/rateLimit.js`.

### 4.2 — Environment Variable Guard

**Current state**: Already present in `api/index.js`. Must be re-implemented in Next.js.

**Fix**: Create `lib/env.js`:
```js
const REQUIRED_ENV = ['MONGO_URI', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'JWT_SECRET', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY']

export function checkEnv() {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      throw new Error(`FATAL: Missing environment variable: ${key}`)
    }
  }
}
```

Call `checkEnv()` inside the `connectDB()` function so it throws on first DB connection attempt if env vars are missing.

### 4.3 — CORS

**Current state**: CORS is handled by Express middleware. In Next.js, CORS is configured per route or globally via `next.config.js`.

**Fix**: In `next.config.js`:
```js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.NODE_ENV === 'production' ? 'https://it-resource-zone.vercel.app' : 'http://localhost:3000' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ]
      }
    ]
  }
}
```

### 4.4 — XSS Sanitization

**Current state**: DOMPurify is imported in `src/utils/sanitize.js` and used in `ExamPage.jsx`, `AdminExamView.jsx`, `SubmissionDetails.jsx`. This is correct and must be preserved in the Next.js migration.

**Requirement**: `safeHTML` from `utils/sanitize.js` must ONLY be called inside Client Components (`'use client'`). DOMPurify requires the browser DOM and will crash in Server Components or Route Handlers.

Keep `utils/sanitize.js` exactly as-is:
```js
import DOMPurify from 'dompurify'

export function safeHTML(dirty) {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'br', 'sub', 'sup'],
    ALLOWED_ATTR: []
  })
}
```

### 4.5 — One-Attempt Enforcement (Server-Side)

Described in Section 3.2. The localStorage `live_taken_${id}` check in the client is kept as a UX hint only (to disable the button before the user even tries). The server enforces the rule authoritatively.

### 4.6 — Admin Token Expiry and Refresh

**Current state**: Admin JWT has a 7-day expiry. There is no token refresh. If the admin forgets to logout and comes back after 7 days, they see a confusing 401 error with no redirect.

**Fix**: In `AdminDashboard.jsx` and `AdminExamView.jsx`, wrap every `fetch` call with a helper that detects 401 and redirects to `/admin`:
```js
async function authFetch(url, options = {}) {
  const res = await fetch(url, options)
  if (res.status === 401) {
    localStorage.removeItem('admin_token')
    window.location.href = '/admin'
    throw new Error('Session expired')
  }
  return res
}
```

Replace all raw `fetch` calls that use `authHeaders()` with `authFetch`.

### 4.7 — Input Validation on Question Import (Server-Side)

**Current state**: Already present in `api/index.js` for the `POST /api/exams/:id/questions` handler. Must be preserved in the Next.js migration unchanged.

### 4.8 — HTTP Security Headers

**Current state**: Already present in `vercel.json`. In Next.js, move these to `next.config.js`:
```js
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ]
    }
  ]
}
```

### 4.9 — Admin Area: Protect from Public Access via URL

**Current state**: The admin dashboard is at `/admin/dashboard` and is "protected" by checking `localStorage.getItem('admin_token')`. If that check is bypassed (disabled JS, SSR), the page could briefly render.

**Fix**: In the Admin layout (`app/admin/layout.jsx`), check for the token server-side. Since the admin token is a JWT stored in localStorage (not a cookie), server-side checking requires moving the token to an httpOnly cookie on login.

**Recommended fix**: On `POST /api/admin/login` success, set the JWT as an httpOnly, SameSite=Strict cookie in addition to returning it in the response body. In `app/admin/layout.jsx`, read the cookie server-side with `cookies()` from `next/headers`. If absent, redirect to `/admin` (the login page).

```js
// Route handler: api/admin/login/route.js
import { cookies } from 'next/headers'
// ...
// After verifying credentials:
const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '7d' })
cookies().set('admin_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60,
  path: '/'
})
return NextResponse.json({ token }) // Still return it for backward compat
```

```js
// app/admin/layout.jsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import jwt from 'jsonwebtoken'

export default function AdminLayout({ children }) {
  const cookieStore = cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) redirect('/admin')
  try {
    jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    redirect('/admin')
  }
  return children
}
```

The `verifyAdminToken()` helper in `lib/auth.js` should also support reading from cookies (for server-side use) in addition to the Authorization header (for client-side fetch calls).

---

## SECTION 5 — Performance Optimizations {#section-5}

### 5.1 — Eliminate Cold Start Latency with ISR and Server Components

**Problem**: Vercel serverless functions cold-start in 1–3 seconds. Every page load for unauthenticated users hits this.

**Fix**: Use Next.js Incremental Static Regeneration (ISR) for public data pages:

- `app/leaderboard/page.jsx` (Server Component): `fetch('/api/leaderboard', { next: { revalidate: 60 } })` — cached and served from Vercel's edge CDN, no DB query on most requests.
- `app/page.jsx` (HomePage): Fully static (no data fetch), cached indefinitely.

For the exams list, ISR with `revalidate: 30` means the page is pre-built and served from edge cache. The DB is only queried once every 30 seconds to regenerate the page, not on every visitor.

### 5.2 — MongoDB Connection Caching

**Current state**: `lib/db.js` caches the connection in `global.mongoose`. This pattern works correctly in Next.js serverless as well. Keep it exactly as-is.

### 5.3 — Stale-While-Revalidate (Client-Side Cache)

**Current state**: `sessionStorage` cache for exams and leaderboard is already implemented in `ExamsPage.jsx` and `Leaderboard.jsx`. Keep this pattern in the Next.js migration.

In the Next.js version, this is less critical for Server-Rendered pages (since they get fresh data on the server), but keep it for Client Components that still fetch on mount.

### 5.4 — API Wake-Up Ping

**Current state**: `fetch('/api/exams').catch(() => {})` in `src/main.jsx`. In Next.js, this is irrelevant because the API runs in the same Next.js server process — there is no separate Express server to wake up.

**Remove** the explicit ping. ISR handles this better: the page is pre-built and served from cache, so there is no cold start for visitors.

### 5.5 — MongoDB Indexes

**Current state**: Already defined in the models. Preserve all existing indexes in the Next.js migration. No changes needed.

### 5.6 — Image Optimization

**Current state**: The `favicon.png` used as a logo is loaded via a regular `<img>` tag. In Next.js, use the `<Image>` component from `next/image` for automatic optimization, lazy loading, and correct sizing.

Replace all `<img src="/favicon.png" ...>` with:
```jsx
import Image from 'next/image'
<Image src="/favicon.png" alt="Logo" width={36} height={36} className="object-contain rounded-xl" />
```

### 5.7 — Font Loading

**Current state**: Font Awesome is loaded from cdnjs.cloudflare.com. This is fine. No changes needed.

If custom fonts are desired in the future, use `next/font` for zero layout shift. For now, keep the system font stack.

### 5.8 — Bundle Size

In the current Vite setup, Tailwind is loaded via CDN (entire ~3MB file). In the Next.js migration, Tailwind is compiled at build time and only the used utility classes are included in the final CSS bundle. This alone reduces CSS payload by ~98%.

---

## SECTION 6 — UI/UX Fixes and Improvements {#section-6}

### 6.1 — Remove All Remaining localStorage Student Name Logic

**Every instance** of `localStorage.getItem('student_name')`, `localStorage.setItem('student_name', ...)`, and the custom `student_name_changed` event must be removed. Replace with Clerk's `useUser()` hook. The name displayed and stored in submissions comes from Clerk's `user.fullName`.

Files to update: `Navbar.jsx`, `BottomNav.jsx`, `HomePage.jsx`, `ExamsPage.jsx`, `ProfilePage.jsx`, `ExamPage.jsx`.

### 6.2 — Profile Page: Show Clerk User Info

`ProfilePage` should display the Clerk user's profile picture, full name, and email. Use Clerk's `useUser()` hook to read these:

```jsx
'use client'
import { useUser } from '@clerk/nextjs'

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  if (!isLoaded) return <SkeletonProfile />
  // ...
  return (
    <div>
      <img src={user.imageUrl} alt="Avatar" className="w-24 h-24 rounded-full" />
      <h2>{user.fullName}</h2>
      <p>{user.primaryEmailAddress?.emailAddress}</p>
    </div>
  )
}
```

### 6.3 — Profile Page: Show Unauthenticated State Gracefully

When a visitor (not signed in) navigates to `/profile`, the Clerk middleware will redirect them to `/sign-in` automatically (see Section 2.2). No manual redirect needed.

### 6.4 — ExamPage: Consistent Name Handling

In `ExamPage.jsx`, the student name is read from `localStorage` for display and submission. Replace with Clerk:

```jsx
const { user } = useUser()
const studentName = user?.fullName || user?.firstName || 'Anonymous'
const clerkUserId = user?.id || null
// Pass both to the submit API call
```

If the user is not signed in, `studentName` is 'Anonymous' and `clerkUserId` is null. After submitting, show a non-intrusive banner: "Sign in to save your score to your profile" with a link to `/sign-in`.

### 6.5 — Profile Page: Name Edit via Clerk

Remove the custom name edit modal from `ProfilePage.jsx`. Replace with Clerk's `<UserProfile>` component (embedded or linked). The edit button should open Clerk's built-in user management modal:

```jsx
import { useClerk } from '@clerk/nextjs'

const { openUserProfile } = useClerk()

<button onClick={() => openUserProfile()}>Edit Profile</button>
```

This handles name changes, password changes, and connected accounts — no custom modal needed.

### 6.6 — Admin Login Page: Remove Duplicate Theme State

**Current state**: `AdminLogin.jsx` has its own `theme` state because it is outside the admin-protected ThemeProvider context. In the Next.js migration, the ThemeProvider is in the root layout and wraps ALL pages including `/admin`. Remove the local theme state from `AdminLogin.jsx` and use `useTheme()`.

### 6.7 — Tab Switch Anti-Cheat

**Current state**: Anti-cheat `visibilitychange` logic is present in `ExamPage.jsx`. Preserve it exactly in the Next.js migration. No changes needed to the logic.

### 6.8 — Double Submission Guard

**Current state**: `submitting` state flag is present in `ExamPage.jsx`. Preserve in the Next.js migration. No changes needed.

### 6.9 — Timer Cleanup on Unmount

**Current state**: Timer cleanup `clearInterval` on unmount is present in `ExamPage.jsx`. Preserve in the Next.js migration.

### 6.10 — Scroll to Top on Screen Change

**Current state**: `useEffect(() => { window.scrollTo(0, 0) }, [screen])` is present in `ExamPage.jsx`. Preserve in the Next.js migration.

### 6.11 — Admin Exam Fetch Uses Published-Only Endpoint

**Current bug**: `AdminExamView.jsx` fetches from `GET /api/exams/${id}` which only returns published exams. If the admin is viewing a draft exam, it returns 404.

**Fix**: Create a separate admin endpoint `GET /api/admin/exams/[id]/route.js` that requires admin auth and returns the exam regardless of published status. Update `AdminExamView.jsx` to call this endpoint with the admin token.

### 6.12 — BottomNav: Exclude More Routes

**Current state**: BottomNav is hidden on `/admin(.*)` and `/exam/:id` routes. In the Next.js migration, also hide it on `/sign-in` and `/sign-up` routes.

### 6.13 — 404 Page

Create `app/not-found.jsx` with a styled 404 page matching the app design. Currently there is a catch-all redirect to `/` in React Router — this should be replaced with a proper 404 page in Next.js.

```jsx
// app/not-found.jsx
import Link from 'next/link'
export default function NotFound() {
  return (
    <div className="bg-theme-bg min-h-screen flex flex-col items-center justify-center text-theme-primary text-center px-4">
      <i className="fas fa-compass text-6xl text-theme-secondary mb-6 opacity-40"></i>
      <h1 className="text-5xl font-black mb-3">404</h1>
      <p className="text-theme-secondary mb-8">This page doesn't exist.</p>
      <Link href="/" className="bg-theme-accent text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-all">
        Go Home
      </Link>
    </div>
  )
}
```

---

## SECTION 7 — Animations and Loading States {#section-7}

### 7.1 — Skeleton Loaders: Apply Everywhere

**Current state**: Skeleton loaders exist in `ExamsPage.jsx`, `Leaderboard.jsx`, and `ProfilePage.jsx`. They are missing from:
- `AdminDashboard.jsx` — uses a spinner
- `AdminExamView.jsx` — uses a spinner
- `SubmissionDetails.jsx` — uses a spinner

**Fix**: Replace all spinning circle loaders with content-shaped skeletons.

**For `AdminDashboard.jsx`**, replace:
```jsx
<div className="flex justify-center py-20">
  <div className="w-10 h-10 border-4 border-theme-accent border-t-transparent rounded-full animate-spin"></div>
</div>
```
With:
```jsx
<div className="space-y-4">
  {[0, 1, 2].map(i => (
    <div key={i} className="bg-theme-surface border border-theme-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2 flex-1">
        <div className="skeleton h-6 w-2/3 rounded-lg" />
        <div className="skeleton h-4 w-1/2 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <div className="skeleton h-9 w-24 rounded-xl" />
        <div className="skeleton h-9 w-24 rounded-xl" />
        <div className="skeleton h-9 w-16 rounded-xl" />
      </div>
    </div>
  ))}
</div>
```

**For `AdminExamView.jsx`**, replace the spinner with:
```jsx
<div className="space-y-4">
  {[0, 1, 2, 3].map(i => (
    <div key={i} className="bg-theme-surface border border-theme-border rounded-2xl p-5">
      <div className="skeleton h-5 w-3/4 rounded-lg mb-3" />
      <div className="space-y-2 ml-5">
        <div className="skeleton h-4 w-1/2 rounded-lg" />
        <div className="skeleton h-4 w-2/3 rounded-lg" />
        <div className="skeleton h-4 w-1/3 rounded-lg" />
        <div className="skeleton h-4 w-1/2 rounded-lg" />
      </div>
    </div>
  ))}
</div>
```

**For `SubmissionDetails.jsx`**, the top loading return is a full-screen spinner. Replace with a full page skeleton that mirrors the actual layout:
```jsx
if (loading) return (
  <div className="bg-theme-bg min-h-screen text-theme-primary pb-20">
    <div className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
      <div className="skeleton h-10 w-64 rounded-xl" />
      <div className="skeleton h-32 w-full rounded-2xl" />
      <div className="space-y-4">
        {[0, 1, 2].map(i => <div key={i} className="skeleton h-28 w-full rounded-2xl" />)}
      </div>
    </div>
  </div>
)
```

### 7.2 — Preserve All Existing Animations

All animations currently defined in `src/index.css` must be copied to `app/globals.css` in the Next.js project. These include:
- `page-enter` (fade up on page mount)
- `card-enter` (card stagger)
- `modal-backdrop` and `modal-enter` (modal animations)
- `skeleton` / `shimmer` (loading placeholders)
- `option-selected-anim` (answer selection pulse)
- `timer-danger` (danger pulse)
- `rank-pop` (rank badge pop)
- `scale-in-center` (radio dot)
- `circle-reveal` (View Transitions API theme toggle)
- `prefers-reduced-motion` override (must remain the LAST rule in globals.css)

Copy them verbatim. Do not modify timing or easing values.

### 7.3 — Loading State for Clerk Auth

When `useUser()` returns `isLoaded: false`, show a skeleton instead of a blank screen or flickering UI.

In every Client Component that uses `useUser()`, handle the loading state:
```jsx
const { user, isLoaded } = useUser()
if (!isLoaded) return <PageSkeleton />
```

Create a reusable `PageSkeleton` component in `components/PageSkeleton.jsx` that shows the navbar skeleton + generic content skeleton.

---

## SECTION 8 — Admin Panel Improvements {#section-8}

### 8.1 — Fix: Admin Exam Fetch for Drafts

See Section 6.11. Admin views must use the authenticated admin endpoint, not the public one.

### 8.2 — Fix: Reorder Questions

**Current state**: Questions can only be added or deleted. There is no way to reorder them once added.

**New feature**: Add drag-to-reorder in `AdminExamView.jsx`. Use the HTML5 Drag and Drop API (no extra library needed). When a question is dropped into a new position, send a `PUT /api/admin/exams/:id/questions/reorder` request with the new ordered array of question IDs.

**Route Handler** (`app/api/admin/exams/[id]/questions/reorder/route.js`):
```js
export async function PUT(request, { params }) {
  const admin = verifyAdminToken()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orderedIds } = await request.json()
  await connectDB()
  await Promise.all(orderedIds.map((id, idx) =>
    Question.findByIdAndUpdate(id, { order: idx })
  ))
  return NextResponse.json({ success: true })
}
```

### 8.3 — Fix: Question Count in Admin Dashboard

**Current state**: The admin exam list shows the exam title, duration, and dates, but not how many questions are in the exam. An admin has to click "View" to find out.

**Fix**: Add a `questionCount` field to the admin exam list response. In `GET /api/admin/exams/route.js`:
```js
const exams = await Exam.find({}, { questions: 0 }).sort({ createdAt: -1 }).lean()
const examIds = exams.map(e => e._id)
const counts = await Question.aggregate([
  { $match: { examId: { $in: examIds } } },
  { $group: { _id: '$examId', count: { $sum: 1 } } }
])
const countMap = Object.fromEntries(counts.map(c => [c._id.toString(), c.count]))
const result = exams.map(e => ({ ...e, questionCount: countMap[e._id.toString()] || 0 }))
return NextResponse.json(result)
```

Display the count in the admin dashboard exam card: `<span>{exam.questionCount} question(s)</span>`.

### 8.4 — Fix: Submission Count in Admin Dashboard

Similarly, show how many students have taken each exam. Add a `submissionCount` to the same admin list response using a similar aggregation on the `Submission` collection.

---

## SECTION 9 — Deployment and Environment {#section-9}

### 9.1 — .env.local (All Variables)

The complete list of environment variables for the Next.js project:

```
# MongoDB
MONGO_URI=

# Admin JWT Auth
ADMIN_USERNAME=
ADMIN_PASSWORD=
JWT_SECRET=

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# App URL (used for server-side fetches in Server Components)
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
# For local dev: NEXT_PUBLIC_BASE_URL=http://localhost:3000

# SEO Verification
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
NEXT_PUBLIC_BING_SITE_VERIFICATION=
```

### 9.2 — vercel.json (Simplified)

In Next.js, Vercel automatically handles routing. The `vercel.json` only needs headers and optionally function configuration:

```json
{
  "headers": [
    {
      "source": "/sitemap.xml",
      "headers": [
        { "key": "Content-Type", "value": "application/xml" },
        { "key": "Cache-Control", "value": "public, max-age=86400" }
      ]
    },
    {
      "source": "/robots.txt",
      "headers": [
        { "key": "Content-Type", "value": "text/plain" },
        { "key": "Cache-Control", "value": "public, max-age=86400" }
      ]
    }
  ]
}
```

The security headers (`X-Frame-Options`, `X-Content-Type-Options`, etc.) should be in `next.config.js` headers, not `vercel.json`, to avoid duplication.

### 9.3 — robots.txt and sitemap.xml

Both files already exist in `public/` (per Section 6.1 of the previous audit). Carry them over to `public/` in the Next.js project unchanged. Alternatively, use Next.js's built-in `app/robots.js` and `app/sitemap.js`:

```js
// app/robots.js
export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/admin' },
    sitemap: 'https://it-resource-zone.vercel.app/sitemap.xml',
  }
}
```

```js
// app/sitemap.js
export default function sitemap() {
  return [
    { url: 'https://it-resource-zone.vercel.app/', changeFrequency: 'weekly', priority: 1 },
    { url: 'https://it-resource-zone.vercel.app/exams', changeFrequency: 'daily', priority: 0.9 },
    { url: 'https://it-resource-zone.vercel.app/leaderboard', changeFrequency: 'daily', priority: 0.8 },
  ]
}
```

### 9.4 — Vercel Free Tier Constraints

The app runs on Vercel's Hobby (free) tier. Constraints to respect:

| Constraint | Limit | Mitigation |
|---|---|---|
| Serverless function duration | 10 seconds | All DB queries use indexes; no long operations |
| Serverless function memory | 1024 MB | No issue with current workload |
| Bandwidth | 100 GB/month | CDN caching reduces origin hits; fine for current scale |
| Build time | 45 minutes | Next.js builds are fast; fine |
| Concurrent executions | 1000 | Fine for current scale |
| Rate limiting | In-memory only | Acceptable; see Section 4.1 note |

MongoDB free tier (Atlas M0) constraints: 512 MB storage, shared cluster, 100 max connections. The `connectDB()` connection caching ensures we do not exhaust the connection pool.

---

## SECTION 10 — Color Palette and Design Tokens {#section-10}

### 10.1 — Keep Existing Palette

The Aurora Slate (light) + Midnight Indigo (dark) palette is already defined correctly. Copy it to `app/globals.css` verbatim:

```css
:root {
  --color-bg: #F0F4FF;
  --color-surface: #FFFFFF;
  --color-primary: #1A2040;
  --color-secondary: #636E8A;
  --color-accent: #4F5AF0;
  --color-border: #D6DDEF;
  --color-error-bg: #FEF2F2;
  --color-error-text: #DC2626;
  --color-error-border: #FEE2E2;
  --color-success-bg: #ECFDF5;
  --color-success-text: #059669;
  --color-success-border: #D1FAE5;
}

.dark {
  --color-bg: #070A14;
  --color-surface: #0F1524;
  --color-primary: #E8EAF6;
  --color-secondary: #7080A0;
  --color-accent: #6366F1;
  --color-border: #1E2A48;
  --color-error-bg: #450a0a;
  --color-error-text: #f87171;
  --color-error-border: #7f1d1d;
  --color-success-bg: #064e3b;
  --color-success-text: #34d399;
  --color-success-border: #065f46;
}
```

Note: The `--color-border` in dark mode changes from `rgba(255, 255, 255, 0.05)` (current) to `#1E2A48` (solid hex). Use the solid hex — it is more compatible with Tailwind's color mixing utilities and avoids alpha-channel issues with `border-theme-border` combined with backgrounds.

### 10.2 — Clerk Component Theming

Clerk's components accept an `appearance` prop. All Clerk components (`<SignIn>`, `<SignUp>`, `<UserButton>`, `<UserProfile>`) must have their appearance configured to match the app palette. Define a shared `clerkAppearance` constant in `lib/clerkTheme.js`:

```js
export const clerkAppearance = {
  variables: {
    colorPrimary: '#6366F1',          // --color-accent (dark mode value; works for both)
    colorBackground: 'var(--color-surface)',
    colorText: 'var(--color-primary)',
    colorTextSecondary: 'var(--color-secondary)',
    colorInputBackground: 'var(--color-bg)',
    colorInputText: 'var(--color-primary)',
    colorDanger: '#f87171',
    colorSuccess: '#34d399',
    borderRadius: '0.75rem',
    fontFamily: 'inherit',
  },
  elements: {
    rootBox: 'w-full',
    card: 'bg-theme-surface border border-theme-border rounded-2xl shadow-xl',
    headerTitle: 'text-theme-primary font-extrabold',
    headerSubtitle: 'text-theme-secondary',
    socialButtonsBlockButton: 'bg-theme-bg border border-theme-border text-theme-primary hover:border-theme-primary/40 rounded-xl font-semibold transition-all',
    formButtonPrimary: 'bg-theme-accent text-white font-bold rounded-xl hover:opacity-90 transition-all',
    formFieldInput: 'bg-theme-bg border border-theme-border text-theme-primary rounded-xl focus:ring-2 focus:ring-theme-accent outline-none',
    formFieldLabel: 'text-theme-primary font-medium text-sm',
    footerActionLink: 'text-theme-accent font-bold hover:underline',
    dividerLine: 'bg-theme-border',
    dividerText: 'text-theme-secondary text-xs',
    identityPreviewText: 'text-theme-primary',
    identityPreviewEditButton: 'text-theme-accent',
    alertText: 'text-theme-error-text text-sm',
    userButtonAvatarBox: 'w-9 h-9 rounded-full',
    userButtonPopoverCard: 'bg-theme-surface border border-theme-border rounded-2xl shadow-xl',
    userButtonPopoverActionButton: 'text-theme-primary hover:bg-theme-bg rounded-xl',
    userButtonPopoverActionButtonText: 'text-theme-primary text-sm font-medium',
    userButtonPopoverFooter: 'hidden',
  }
}
```

Import and use `clerkAppearance` in every page that renders a Clerk component.

---

## SECTION 11 — Priority Order for Agent {#section-11}

Apply all changes in this exact order. Do not start a new section until the current one is fully complete and verified.

1. **SETUP** — Section 1.1: Create the Next.js project, install dependencies, configure Tailwind as a PostCSS plugin.

2. **FOUNDATION** — Section 10.1: Copy all CSS variables and animations from `src/index.css` to `app/globals.css`. Verify the palette renders correctly in both light and dark mode before touching any component files.

3. **INFRASTRUCTURE** — Section 1.2: Create the full directory structure (stub files for all routes and pages — empty shell components are fine at this stage).

4. **DB AND MODELS** — Section 3.1: Copy all three model files (`Exam.js`, `Question.js`, `Submission.js`) to `lib/models/`. Add the `clerkUserId` field and new indexes to `Submission.js`. Copy `lib/db.js` unchanged.

5. **API ROUTES** — Section 1.3: Migrate all Express routes to Next.js Route Handlers. Verify each endpoint returns the correct response shape and status code. Do not proceed until all 18 API routes are working.

6. **SECURITY** — Section 4.1: Add rate limiting to all sensitive routes. Section 4.2: Add env variable guard. Section 4.9: Move admin token to httpOnly cookie.

7. **AUTH** — Section 2.1 through 2.7: Install Clerk, configure middleware, wrap root layout, build custom sign-in and sign-up pages. Verify the Clerk session is accessible in Client Components.

8. **DB SCHEMA** — Section 3.2 and 3.3: Add server-side one-attempt enforcement. Add the `clerkUserId`-based profile query endpoint.

9. **PAGES** — Migrate all page components to the `app/` directory. Apply Server Component optimization to leaderboard and homepage (Section 5.1). Apply ISR where applicable.

10. **FRONTEND AUTH WIRING** — Section 6.1 through 6.5: Remove ALL localStorage student name logic. Wire `useUser()` into `ExamPage`, `Navbar`, `BottomNav`, `ProfilePage`.

11. **ANIMATIONS** — Section 7.1: Add skeleton loaders to all remaining pages with spinners. Section 7.2: Verify all animations are preserved in `globals.css`. Section 7.3: Add Clerk loading state handling.

12. **ADMIN FIXES** — Section 8.1 through 8.4: Fix admin exam fetch for drafts, add question reorder, add question and submission counts to admin dashboard.

13. **UX POLISH** — Section 6.6 through 6.13: Remove duplicate admin theme state, wire bottom nav correctly, add 404 page, add post-exam "sign in to save" banner.

14. **DEPLOYMENT** — Section 9.1 through 9.4: Configure `.env.local`, simplify `vercel.json`, add robots and sitemap, verify Vercel free tier constraints.

15. **DOCUMENTATION** — Rewrite README.md for the Next.js project. Update the project structure tree, prerequisites (Node.js 18+, MongoDB, Clerk account), installation steps, environment variables table, and API reference. Remove all references to Vite, the `server.js` file, `concurrently`, and the old `api/index.js` Express setup.

---

## SECTION 12 — Notes for Agent {#section-12}

### Critical Rules

- **Do NOT use Pages Router.** All Next.js routing is App Router only.
- **Do NOT use `getServerSideProps` or `getStaticProps`.** These are Pages Router patterns. Use Server Components, Route Handlers, and `fetch` with `next: { revalidate }` for caching.
- **Do NOT upgrade MongoDB, Mongoose, or jsonwebtoken.** Use the exact versions from the current `package.json`.
- **Do NOT add student email verification or additional auth steps beyond Clerk's defaults.** Keep the flow frictionless.
- **Do NOT break the admin JWT system.** It is intentionally separate from Clerk.
- **Do NOT use `dangerouslySetInnerHTML` in Server Components.** Only use it in Client Components after calling `safeHTML()`.
- **Do NOT hardcode hex colors in JSX `className` strings.** Use only the `theme-*` Tailwind tokens defined in `tailwind.config.js`.
- **Do NOT add student-to-student messaging, team features, or any feature not present in the original codebase.** This guide is about hardening and migrating existing features, not adding new ones.

### Response Shape Contracts

The following API response shapes are consumed by the frontend. Do not change them during migration:

- `GET /api/exams` → `Array<{ _id, title, duration, liveStart, liveEnd, published, createdAt }>`
- `GET /api/exams/:id` → `{ _id, title, duration, liveStart, liveEnd, published, questions: Array<{ question, options, correct, explanation, order }> }`
- `GET /api/leaderboard` → `Array<{ exam: {...}, submissions: Array<{...}> }>`
- `GET /api/submissions/user/:clerkUserId` → `Array<{ _id, examId: { _id, title }, score, total, wrong, unanswered, wasLive, submittedAt }>`
- `GET /api/submissions/details/:id` → `{ submission: {...}, questions: Array<{...}> }`
- `POST /api/exams/:id/submit` → `{ score, total, wrong, unanswered, questions }`

### DOMPurify Server Constraint

DOMPurify accesses `window` and `document`. It will throw a `window is not defined` error if imported in a Server Component or Route Handler. The build will succeed but the runtime will crash. Guard every import:
- Only import `safeHTML` in files that have `'use client'` at the top.
- If a component needs to display sanitized HTML AND be a Server Component, sanitize on the client side by splitting into a Client sub-component.

### Clerk Free Tier Limits

Clerk Hobby plan: 10,000 monthly active users. At 20–50 users, the app is well within limits. The Hobby plan supports email/password and social OAuth. No credit card required.

### MongoDB Atlas Free Tier

Atlas M0: 512 MB storage, shared CPU, 100 max simultaneous connections. The connection caching in `lib/db.js` ensures at most 1–2 connections per serverless instance. With Vercel's serverless model, peak concurrency for this app size is well under 10 simultaneous instances. No issue.

### Vercel Hobby Plan: Serverless Function Cold Starts

Even with Next.js, cold starts exist. ISR for Server Components is the primary mitigation — the leaderboard and homepage are served from Vercel's edge cache, bypassing the serverless function entirely on most requests. For exam taking and submission (Client-side fetches to Route Handlers), cold starts can still occur after inactivity. The app should feel fast for any user who arrived within the last 5 minutes of another user's activity. For a 20–50 user app, this is acceptable.

### Tailwind CDN Removal

The current codebase loads Tailwind from `https://cdn.tailwindcss.com` in `index.html`. This loads a 3 MB JavaScript file that compiles CSS in the browser on every page load. In the Next.js migration, Tailwind is compiled at build time. The final CSS bundle for this app will be under 50 KB. This is the single largest performance win from the migration.

### parseQuestions.js and sanitize.js

Both files are pure JavaScript with no browser or Node.js specific APIs (except `DOMPurify` in `sanitize.js`). Copy them to `utils/` in the new project unchanged. `parseQuestions.js` can be used in both Server Components and Client Components. `sanitize.js` must only be used in Client Components.

### ThemeContext.jsx

The `ThemeContext.jsx` and `ThemeProvider` remain almost identical. The only change is that it must be a Client Component (add `'use client'` at the top), because it uses `useState` and `useEffect`. Wrap it in a separate `components/ThemeProvider.jsx` so the root layout stays a Server Component.

### View Transitions API

The `circle-reveal` theme toggle animation uses `document.startViewTransition`. This is a Client Component feature. Ensure the `toggleTheme` function is only called from Client Components. The animation keyframes in `globals.css` are fine — they are just CSS and have no browser constraint.

### Admin Routes Are Not Clerk-Protected

The `/admin` route prefix is explicitly excluded from the Clerk middleware matcher. Admin authentication is purely cookie-based JWT (see Section 4.9). This is intentional — Clerk is for students only, and mixing the two auth systems in the admin area adds unnecessary complexity.
