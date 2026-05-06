# IT Resource Zone

IT Resource Zone is a comprehensive, production-ready online examination platform designed for IT students and professionals. Built with Next.js 14 App Router, it provides a seamless experience for taking live assessments, practicing past exams, and competing on global and per-exam leaderboards. 

The platform features a secure, separated architecture for both student users (powered by Clerk) and administrative management (powered by custom JWT authentication).

## Key Features

- **Live & Practice Exams:** Support for scheduled, time-limited live examinations alongside accessible practice modes for past exams.
- **Advanced Anti-Cheat Systems:** Built-in safeguards including automated exam submission upon detecting tab switching or browser closure during live assessments.
- **Dynamic Leaderboards:** Real-time global and per-exam ranking systems based on performance metrics and submission times.
- **Student Profiles:** Individualized dashboards tracking historical submissions, scores, and exam progress.
- **Admin Management Dashboard:** Secure interface for creating exams, managing questions, adjusting schedules, and reviewing user submissions.
- **Dark/Light Mode:** First-class support for both light and dark themes with persistent user preferences.
- **SEO Optimized:** Implements modern AI crawler compatibility via Markdown content negotiation (`llms.txt`) and dynamic XML sitemaps.

## Technology Stack

- **Framework:** Next.js 14 (App Router)
- **UI Library:** React 19
- **Database:** MongoDB (via Mongoose with connection pooling and transactions)
- **Authentication (Students):** Clerk
- **Authentication (Admin):** JWT with httpOnly cookies
- **Styling:** Tailwind CSS with custom design tokens

## Prerequisites

- Node.js 18 or newer
- A MongoDB cluster (e.g., MongoDB Atlas)
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
JWT_SECRET=your_secure_jwt_secret

# Clerk Authentication (Student Portal)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Site Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your_google_verification_code
NEXT_PUBLIC_BING_SITE_VERIFICATION=your_bing_verification_code
```

## Running the Application

To start the local development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Application Structure

### Public / Student Routes
- `/` - Landing page
- `/exams` - Consolidated view of live, upcoming, and past exams
- `/exam/[id]` - Secure exam execution environment
- `/leaderboard` - Global aggregated leaderboard
- `/leaderboard/[id]` - Exam-specific leaderboard
- `/profile` - Authenticated user profile and historical data

### Administrative Routes
- `/admin` - Secure administrator authentication gateway
- `/admin/dashboard` - Centralized exam and user management interface

## Notes on Architecture

- The application strictly enforces separation of concerns regarding authentication. Student accounts are managed exclusively via Clerk, whereas administrative access bypasses Clerk in favor of a standalone JWT implementation, ensuring robust administrative isolation.
- The project has been fully migrated from a legacy React/Express monolith to a unified Next.js App Router structure, leveraging server-side rendering and edge-compatible API routes for maximum performance and security.
