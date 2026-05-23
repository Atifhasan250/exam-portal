# IT Resource Zone Next Improvement Tracker

This file tracks what should be improved next after the current production hardening work. The app is good enough for a small student/community beta, but these items will make it safer, more trustworthy, and easier to grow later.

## Priority 0 - Do Now

- [ ] Resolve Google Search Console security warning
  - Deploy the latest `noindex` and robots fixes for `/admin`, `/sign-in`, and `/sign-up`.
  - In Search Console, open **Security issues**.
  - Expand **Possible phishing detected on user login** and check affected URLs.
  - Click **Request Review** after deployment.
  - Explain that this is an educational exam portal, login is legitimate, auth is handled by Clerk, admin pages are noindexed/blocked, and the site uses HTTPS.

- [ ] Submit sitemap again
  - Submit: `https://irz.atifhasan.com/sitemap.xml`
  - If Search Console says "Couldn't fetch", wait and retry after the security review request.
  - Confirm the sitemap still opens in browser before resubmitting.

- [ ] Run database indexes once in production environment
  - Run `npm run db:indexes` against the production MongoDB.
  - This matters for duplicate live exam protection and query performance.

- [ ] Confirm production environment variables
  - `NEXT_PUBLIC_SITE_URL=https://irz.atifhasan.com`
  - `ADMIN_PASSWORD_HASH` is set.
  - `ADMIN_PASSWORD` is not set in Vercel production.
  - `JWT_SECRET` is 32+ characters.
  - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set.
  - Clerk production keys are set.

## Priority 1 - Safety and Trust

Recommended order for this app:

1. Leaderboard privacy controls
2. Rank consistency
3. Clearer privacy text
4. Admin security improvements later

- [ ] Add leaderboard privacy controls
  - Let students choose whether their real name appears on leaderboards.
  - Default options can be: full name, first name only, initials, or anonymous.
  - Recommended default for current students: first name only.
  - Store preference per user.
  - Apply the same display rule everywhere leaderboards appear.
  - This is the best next improvement because students may not want their full name public.

- [ ] Review rank consistency
  - Make public leaderboard, exam leaderboard, profile rank, and admin user details use the same ranking rule.
  - Recommended rule: live submissions only, best/first valid submission per user, score desc, submittedAt asc.
  - Move any remaining custom rank logic into `lib/leaderboard.js`.

- [ ] Improve admin security further
  - Current same-origin checks are good for now.
  - Later add a real CSRF token flow for admin POST/PUT/DELETE routes.
  - Consider shorter admin token lifetime or a token version/invalidation field.
  - This is useful, but it can wait while you are the only admin.

- [ ] Add clearer privacy text
  - Explain that exam scores and leaderboard names may be visible.
  - Explain how students can request account/data deletion.
  - Mention Clerk as the auth provider.

## Priority 2 - SEO and Content

Recommended order for this app:

1. Add real `/resources` content.
2. Add richer public text to `/exams`, `/leaderboard`, and `/tasks`.
3. Keep Search Console maintained.
4. Add human-friendly exam slugs later.

- [ ] Add real `/resources` content before indexing
  - Keep `/resources` noindexed while it is placeholder-like.
  - Add real beginner resources: YouTube playlists, free docs, practice links, course roadmap, and topic categories.
  - After useful content exists, remove `noindex`.
  - This is especially useful for your current beginner students and future resource/course plan.

- [ ] Add richer public text to important pages
  - `/exams`: explain live exams, practice exams, scoring, beginner IT topics.
  - `/leaderboard`: explain ranking, live attempts, score/tie rules.
  - `/tasks`: explain habit tracking and monthly progress for students.
  - Individual exam pages: add short exam description, topic, level, duration, and what students will practice.

- [ ] Add human-friendly exam slugs later
  - Current URLs use Mongo IDs, which work but are not ideal for users/SEO.
  - Future format example: `/exam/html-basics-week-1`.
  - Keep old ID URLs redirecting or still supported to avoid breaking links.
  - This is good later, but not urgent for the current beta.

- [ ] Keep Search Console maintained
  - Use the `https://irz.atifhasan.com` property.
  - Submit only the custom-domain sitemap.
  - Use URL Inspection for homepage and important public pages after major updates.

## Priority 3 - Reliability and Testing

Recommended order for this app:

1. Add clearer empty/error states.
2. Add basic smoke tests.
3. Add a seed/dev script.
4. Add CI later.

- [ ] Add basic smoke tests
  - Public homepage returns 200.
  - `/robots.txt` returns custom-domain sitemap.
  - `/sitemap.xml` contains `irz.atifhasan.com`.
  - Public exam API does not expose `correct`.
  - Unauthenticated users cannot access profile submission details.
  - Admin APIs reject unauthenticated requests.
  - Duplicate live exam submit is rejected.
  - Start small; a huge test suite is not needed yet.

- [ ] Add a small seed/dev script
  - Create a sample exam with questions.
  - Create predictable local data for testing admin/exam flows.
  - Keep it safe so it cannot accidentally wipe production data.

- [ ] Add clearer error/empty states
  - Exams page: no exams, network error, loading.
  - Leaderboard: no results yet.
  - Profile: failed to load submissions.
  - Tasks: failed to save planner data.
  - Admin: invalid form data and failed API calls.
  - This is one of the most practical improvements for real student use.

- [ ] Add CI later
  - Run lint.
  - Run smoke tests.
  - Optionally run build when you are ready to allow it regularly.

## Priority 4 - UI and Product Polish

Recommended order for this app:

1. Polish mobile layout where students actually use the app.
2. Improve dashboard density gradually.
3. Improve light mode.
4. Replace Font Awesome CDN later.
5. Improve admin UX as you use it more.

- [ ] Improve dashboard density
  - Reduce overuse of large rounded cards.
  - Use tighter spacing for repeated operational pages like exams, profile, tasks, and admin.
  - Keep the homepage visual identity, but make app pages feel more like a focused student dashboard.

- [ ] Improve light mode
  - Increase contrast for text and borders.
  - Reduce the one-note indigo/purple feel.
  - Add a few neutral and success/warning accents for clearer hierarchy.

- [ ] Replace Font Awesome CDN later
  - Use a local icon package such as `lucide-react`.
  - This improves CSP, reduces external dependency risk, and makes icons easier to control.
  - Good cleanup, but not urgent for launch.

- [ ] Polish mobile layout
  - Check bottom nav does not cover important buttons.
  - Add enough bottom padding on long pages.
  - Test exams, tasks, profile, leaderboard, and admin on small screens.

- [ ] Improve admin UX
  - Add better validation messages.
  - Add safer confirmation dialogs.
  - Add question import preview before saving.
  - Show publish/unpublish status more clearly.

## Later Commercial-Grade Features

Do not build these yet. They are good ideas only after the free/community workflow is stable.

- [ ] Course/resource payment system
  - Do not add now.
  - Add only when free resources and exam workflows are stable.

- [ ] Role-based access
  - Student, moderator, admin, instructor.
  - Useful if the community grows beyond one admin.

- [ ] Backup and recovery plan
  - Database backups.
  - Export submissions.
  - Export exam questions.

- [ ] Analytics dashboard
  - Monthly student progress.
  - Habit consistency.
  - Exam topic weakness.
  - Course/resource usage.

## Current Recommendation

Launch and use the app with your current students as a beta. After Priority 0 is complete, focus on these next five:

1. Leaderboard privacy controls
2. Rank consistency
3. Better empty/error states
4. Real `/resources` page content
5. Basic smoke tests

Avoid payments, roles, complex analytics, and big redesigns until the student workflow is stable.
