# IT Resource Zone

Live site: `https://irz.atifhasan.com`

IT Resource Zone is a production Next.js 15 learning portal for beginner IT students. It combines public exam discovery and leaderboards with signed-in exam attempts, private dashboards, study planning, habit tracking, admin notifications, resource progress, and admin content management.

The platform features a secure, separated architecture for both student users (powered by Clerk) and administrative management (powered by custom JWT authentication).

## Key Features

- **Live & Practice Exams:** Scheduled live assessments and practice access for past exams with timed attempts, answer locking, instant scoring, and review.
- **Exam Integrity Controls:** Attempt tracking, one-submission live exam support, protected live questions, answer locking, and suspicious-event handling for live sessions.
- **Dynamic Leaderboards:** Public global and per-exam rankings based on score, timing, and published submissions.
- **Student Profiles & Dashboard:** Private dashboard summaries, recommendations, submission history, account settings, learning report export, password tools, and account deletion.
- **Daily Habits & Study Planner:** Weekly task planning, daily habit tracking, history views, streaks, and consistency scoring.
- **Resource Hub:** Signed-in library for curated YouTube lessons, PDFs, images, files, and useful links with progress tracking.
- **Admin Management Dashboard:** Secure admin tools for exams, questions, users, notifications, resource categories, resources, playlist imports, uploaded assets, and audit logging.
- **Dark/Light Mode:** First-class support for both light and dark themes with persistent user preferences.
- **SEO/PWA Optimized:** Canonical metadata, dynamic sitemap, crawler controls, `llms.txt`, markdown responses for AI crawlers, manifest icons, service worker, and offline fallback.

## Technology Stack

- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Database:** MongoDB (via Mongoose with connection pooling and transactions)
- **Authentication (Students):** Clerk
- **Authentication (Admin):** JWT with httpOnly cookies
- **Styling:** Tailwind CSS with custom design tokens
- **Resources/Media:** ImageKit and YouTube integrations
- **Analytics/Monitoring:** Vercel Analytics, PostHog, and Sentry
- **Rate Limiting/Caching:** Upstash Redis where configured
- **Notifications:** Web Push

## Prerequisites

- Node.js 18 or newer
- A MongoDB deployment that supports transactions, such as MongoDB Atlas or a local replica set
- Clerk Application credentials

## Installation and Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Configure Environment Variables:**

Create a `.env` or `.env.local` file in the root directory and populate it with the following required variables:

```env
# Database
MONGO_URI=your_mongodb_connection_string

# Admin Authentication
ADMIN_USERNAME=your_secure_admin_username
ADMIN_PASSWORD=your_secure_admin_password
# Required in production:
ADMIN_PASSWORD_HASH=scrypt:your_salt:your_derived_hex_hash
JWT_SECRET=your_secure_jwt_secret

# Clerk Authentication (Student Portal)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Site Configuration
# In Vercel production, keep this exact custom domain. Do not use the Vercel
# subdomain here, or robots/sitemap/canonical URLs may point at the wrong host.
NEXT_PUBLIC_SITE_URL=https://irz.atifhasan.com
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your_google_verification_code
NEXT_PUBLIC_BING_SITE_VERIFICATION=your_bing_verification_code

# Persistent rate limiting for admin login
UPSTASH_REDIS_REST_URL=your_upstash_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token

# Optional integrations
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=your_posthog_project_token
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
SENTRY_AUTH_TOKEN=your_sentry_auth_token
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_CONTACT_EMAIL=itresourcezone@gmail.com
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint
```

Generate a production admin password hash with:

```bash
node -e "const crypto=require('crypto'); const password=process.argv[1]; const salt=crypto.randomBytes(16).toString('hex'); const hash=crypto.scryptSync(password,salt,64).toString('hex'); console.log(`scrypt:${salt}:${hash}`)" "your-admin-password"
```

## SEO Deployment Checklist

- Set `NEXT_PUBLIC_SITE_URL=https://irz.atifhasan.com` in Vercel production environment variables.
- Submit `https://irz.atifhasan.com/sitemap.xml` in Google Search Console.
- Use URL Inspection for `https://irz.atifhasan.com/` after major deploys and request indexing.
- Keep `robots.txt`, `sitemap.xml`, canonical URLs, OpenGraph URLs, and JSON-LD URLs on the custom domain.
- Keep signed-in areas noindexed/disallowed: `/dashboard`, `/profile`, `/exams/history`, `/tasks`, `/resources`, `/sign-in`, `/sign-up`, `/admin`, and `/api/*`.
- Keep public indexing focused on `/`, `/exams`, `/exam/[id]`, `/leaderboard`, `/leaderboard/[id]`, `/privacy`, and `/terms`.

## Running the Application

To start the local development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Cron Jobs On Vercel Hobby

Vercel Hobby supports one scheduled cron run per day, so `vercel.json` only schedules the daily admin notification delivery route. Automatic live-exam notification cron jobs are intentionally not used on this plan; send exam announcements from the admin notification dashboard instead.

## Application Structure

### Public Routes
- `/` - Home page
- `/exams` - Consolidated view of live, upcoming, and past exams
- `/exam/[id]` - Public exam overview and signed-in exam entry
- `/leaderboard` - Global aggregated leaderboard
- `/leaderboard/[id]` - Exam-specific leaderboard
- `/privacy` - Privacy Policy
- `/terms` - Terms of Service

### Signed-In Student Routes
- `/dashboard` - Learning summary, progress, recommendations, and resource progress
- `/profile` - Account settings, submission summaries, PWA panel, report export, and account deletion
- `/profile/submission/[id]` - Private submission review
- `/exams/history` - Authenticated exam history
- `/tasks` - Daily habits and weekly study planner
- `/tasks/history` - Task and habit analytics
- `/resources` - Curated resource library
- `/resources/[slug]` - Resource category page
- `/resources/watch/[slug]` - YouTube lesson player
- `/resources/view/[slug]` - PDF, image, file, or external link viewer

### Administrative Routes
- `/admin` - Secure administrator authentication gateway
- `/admin/dashboard` - Centralized dashboard hub
- `/admin/exams` - Comprehensive exam and question management
- `/admin/resources` - Resource, category, asset, and YouTube import management
- `/admin/notifications` - Admin notification center
- `/admin/users` - Detailed user list with individual progress tracking

## Notes on Architecture

- Student accounts are managed through Clerk. Administrative access is separate and uses JWT/httpOnly cookies with dedicated route protection.
- Public discovery routes are indexable. Student dashboards, profile data, planner data, resources, auth pages, admin tools, and APIs are private or intentionally non-indexable.
- The project uses a unified Next.js App Router structure with server components, API routes, middleware protection, dynamic metadata, and cached public data helpers.
- Local standalone MongoDB instances do not support the transactions used by account deletion, exam deletion, submissions, and resource asset reference counting. Use Atlas or initialize local MongoDB as a replica set for those flows.
- `npm run build` is intentionally skipped in this workspace's verification flow. Use linting and targeted runtime checks instead.

## API Route Checklist

Before adding or changing an API route, verify:

- Public read routes live under `/api/*`; new admin-only mutations should prefer `/api/admin/*`.
- Legacy exam mutations under `/api/exams/*` remain for compatibility. When touching them, keep `requireAdmin()`, `enforceSameOrigin()`, strict ObjectId validation, Zod body validation, and audit logging.
- Public mutating routes must derive identity/display fields server-side, call `enforceSameOrigin()` or equivalent CSRF protection for cookie-based auth, and apply rate limiting when abuse would affect integrity.
- Public responses should return DTOs instead of raw Mongo documents.
- Multi-collection writes should use transactions or a repair script when denormalized counters are involved.
