# IT Resource Zone Next Improvement Tracker

Last reviewed: 2026-05-25

This file tracks what should be improved next after the current production hardening work. The app is good enough for a small student/community beta, but these items will make it safer, more trustworthy, and easier to grow later.

## Status Legend

- `[x] Done` means the repo currently shows the work, or you confirmed the external production step is complete.
- `[ ] Pending` means not implemented yet.
- `Status: Partial` means some parts are already present, but the item is not fully complete.
- `Status: External` means it depends on Vercel, MongoDB Atlas, Search Console, or production environment settings, so the repo alone cannot prove it.

## Current Codebase Snapshot

- Lint passes with `cmd /c npm.cmd run lint`.
- `npm audit --audit-level=moderate` reports `found 0 vulnerabilities`.
- `npm run build` was intentionally skipped.
- `.env`, `.next`, and `node_modules` are ignored by git.
- `improve.md` and `NEXT_IMPROVEMENTS.md` are tracked documentation files; they do not affect runtime much, but can be moved to `docs/` later for repo cleanliness.

## Priority 0 - Done / Confirmed Before Launch

- [x] Resolve Google Search Console security warning
  - Status: Done, based on your confirmation.
  - Code verified: `/admin`, `/sign-in`, and `/sign-up` have `noindex`.
  - Code verified: robots disallows `/admin`, `/api`, `/profile`, and `/tasks/history`.
  - Search Console review is external; keep the review explanation focused on Clerk auth, HTTPS, noindexed admin/auth pages, and education/exam portal purpose.

- [x] Submit sitemap again
  - Status: Done, based on your confirmation.
  - Expected sitemap URL: `https://irz.atifhasan.com/sitemap.xml`.
  - Code verified: sitemap uses the canonical site URL from `getSiteUrl()`.
  - Code verified: `robots.js` points crawlers to `${baseUrl}/sitemap.xml`.

- [x] Run database indexes once in production environment
  - Status: Done, based on your confirmation.
  - Repo verified: `npm run db:indexes` exists and calls `scripts/ensureIndexes.js`.
  - This matters for duplicate live exam protection and query performance.

- [x] Confirm production environment variables
  - Status: Done, based on your confirmation.
  - Required production values:
    - `NEXT_PUBLIC_SITE_URL=https://irz.atifhasan.com`
    - `ADMIN_PASSWORD_HASH` is set.
    - `ADMIN_PASSWORD` is not set in Vercel production.
    - `JWT_SECRET` is 32+ characters.
    - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set.
    - Clerk production keys are set.
  - Code verified: production admin security fails if `ADMIN_PASSWORD_HASH` is missing.
  - Code verified: `JWT_SECRET` length is checked by `assertAdminSecurityEnv()`.

## Priority 1 - Safety and Trust

Recommended order for this app:

1. Leaderboard privacy controls.
2. Rank consistency final pass.
3. Admin security improvements.
4. Basic smoke tests.
5. Remaining empty/error states.

- [x] Add live-answer endpoint rate limiting
  - Status: Done.
  - `/api/exams/[id]/attempts/[attemptId]/answers` now rate-limits after auth with key parts `[userId, id, attemptId]`.
  - Current limit: `120/minute` per user/attempt with persistent rate limiting required in production.

- [ ] Harden production rate-limit fallback
  - Status: Partial.
  - Good: admin login and final exam submit already use `requirePersistent: true`.
  - Gap: several write routes fall back to in-memory rate limiting if Upstash fails.
  - For launch-critical routes, prefer fail-closed persistent rate limiting in production.
  - Candidate routes: live answer lock, attempt start, attempt events, ImageKit auth, YouTube import/preview.

- [ ] Harden ImageKit upload auth
  - Status: Partial.
  - Good: only admin can request upload auth.
  - Good: uploaded asset registration validates file hash, MIME type, size <= 50 MB, URL, and `/resources` folder.
  - Good: ImageKit upload signature now lasts 5 minutes instead of 30 minutes.
  - Gap: direct ImageKit upload itself is not constrained server-side by MIME/size before the upload happens.
  - Keep ImageKit dashboard restrictions tight if available.

- [ ] Add leaderboard privacy controls
  - Status: Pending.
  - Current behavior: trusted Clerk display name is saved as `studentName` and shown publicly.
  - Let students choose whether their real name appears on leaderboards.
  - Default options can be: full name, first name only, initials, or anonymous.
  - Recommended default for current students: first name only.
  - Store preference per user.
  - Apply the same display rule everywhere leaderboards appear.
  - This is the best next product/privacy improvement because students may not want their full name public.

- [ ] Review rank consistency
  - Status: Partial.
  - Good: core ranking helpers exist in `lib/leaderboard.js`.
  - Good: exam leaderboard uses `getRankedLiveSubmissionPage()`.
  - Good: admin user details use `getLiveSubmissionRankMap()`.
  - Check remaining UI paths so public leaderboard, exam leaderboard, profile rank, and admin user details all use the same rule.
  - Recommended rule: live submissions only, best/first valid submission per user, score desc, submittedAt asc.
  - Keep any remaining custom rank logic inside `lib/leaderboard.js`.

- [ ] Improve admin security further
  - Status: Partial.
  - Good: same-origin checks are in place for mutating routes.
  - Good: admin cookie is `httpOnly`, production `secure`, and `sameSite: strict`.
  - Later add a real CSRF token flow for admin POST/PUT/DELETE routes.
  - Consider shorter admin token lifetime or a token version/invalidation field.
  - Current admin JWT lifetime is 24 hours.
  - This can wait while you are the only admin, but should happen before adding more admins.

- [ ] Add clearer privacy text
  - Status: Partial.
  - Good: privacy page mentions exam submissions, scores, leaderboard rankings, account deletion, and Clerk.
  - Good: contact email typo is fixed.
  - Gap: explicitly explain what student name appears publicly and how leaderboard privacy preferences work after that feature exists.
  - Explain that exam scores and leaderboard names may be visible.
  - Explain how students can request account/data deletion.
  - Mention Clerk as the auth provider.

## Priority 2 - SEO and Content

Recommended order for this app:

1. Verify real `/resources` content exists before indexing.
2. Add richer public text to `/exams`, `/leaderboard`, and `/tasks`.
3. Keep Search Console maintained.
4. Add human-friendly exam slugs later.

- [ ] Verify real `/resources` content before indexing
  - Status: External / content-dependent.
  - Code state: `/resources` is currently indexable.
  - If real categories/resources are published, this is fine.
  - If the page is still placeholder-like in production, temporarily set `/resources` to `noindex`.
  - Add real beginner resources: YouTube playlists, free docs, practice links, course roadmap, and topic categories.

- [ ] Add richer public text to important pages
  - Status: Partial.
  - Good: `/exams`, `/leaderboard`, homepage, privacy, terms, and resource metadata already have useful text.
  - Improve `/exams`: explain live exams, practice exams, scoring, beginner IT topics.
  - Improve `/leaderboard`: explain ranking, live attempts, score/tie rules.
  - Improve `/tasks`: explain habit tracking and monthly progress for students.
  - Improve individual exam pages: add short exam description, topic, level, duration, and what students will practice.

- [ ] Add human-friendly exam slugs later
  - Status: Pending.
  - Current URLs use Mongo IDs, which work but are not ideal for users/SEO.
  - Future format example: `/exam/html-basics-week-1`.
  - Keep old ID URLs redirecting or still supported to avoid breaking links.
  - This is good later, but not urgent for the current beta.

- [ ] Keep Search Console maintained
  - Status: External / ongoing.
  - Use the `https://irz.atifhasan.com` property.
  - Submit only the custom-domain sitemap.
  - Use URL Inspection for homepage and important public pages after major updates.

## Priority 3 - Reliability and Testing

Recommended order for this app:

1. Add basic smoke tests.
2. Add clearer empty/error states.
3. Add a seed/dev script.
4. Add CI later.

- [ ] Add basic smoke tests
  - Status: Pending.
  - Public homepage returns 200.
  - `/robots.txt` returns custom-domain sitemap.
  - `/sitemap.xml` contains `irz.atifhasan.com`.
  - Public exam API does not expose `correct` during active live exams.
  - Unauthenticated users cannot access profile submission details.
  - Admin APIs reject unauthenticated requests.
  - Duplicate live exam submit is rejected.
  - Start small; a huge test suite is not needed yet.

- [ ] Add clearer error/empty states
  - Status: Partial.
  - Good: exams, resources, admin resources, admin users, tasks, and exam flow already have some empty/error states.
  - Still review these manually on mobile:
    - Exams page: no exams, network error, loading.
    - Leaderboard: no results yet and API failure.
    - Profile: failed to load submissions.
    - Tasks: failed to save planner data.
    - Admin: invalid form data and failed API calls.
  - This is one of the most practical improvements for real student use.

- [ ] Add a small seed/dev script
  - Status: Pending.
  - Create a sample exam with questions.
  - Create predictable local data for testing admin/exam flows.
  - Keep it safe so it cannot accidentally wipe production data.

- [ ] Add CI later
  - Status: Pending.
  - Run lint.
  - Run smoke tests.
  - Optionally run build when you are ready to allow it regularly.

## Priority 4 - Performance, Security Hardening, and Cleanup

Recommended order for this app:

1. Optimize small static assets.
2. Clean tracked docs.
3. Reduce heavy client-side dependencies later.
4. Tighten CSP later.
5. Prepare MongoDB scaling path.

- [ ] Optimize favicon and social image
  - Status: Pending.
  - `public/favicon.png` is large for a favicon.
  - Add smaller favicon sizes and keep the Open Graph image separate.
  - This is not urgent, but it is easy bandwidth cleanup.

- [ ] Move cleanup docs into `docs/` or remove old notes
  - Status: Pending.
  - Current tracked docs include `improve.md` and `NEXT_IMPROVEMENTS.md`.
  - They do not meaningfully affect runtime, but organizing them makes the repo easier to maintain.

- [ ] Reduce heavy client-side dependencies later
  - Status: Pending.
  - Current homepage/nav uses `three` for `LaserFlow` and `gsap` for `StaggeredMenu`.
  - This affects browser bundle/performance more than Vercel server cost.
  - Keep for brand feel if performance is acceptable, but test on low-end Android.

- [ ] Tighten CSP later
  - Status: Partial.
  - Good: core security headers exist.
  - Current CSP allows `unsafe-inline`, broad `img-src https:`, and external Font Awesome CDN.
  - Replace Font Awesome CDN with a local icon package before tightening CSP.
  - This is not a launch blocker for the current beta.

- [ ] Prepare MongoDB scaling path
  - Status: Pending / operational.
  - M0/free tier is probably fine for 50-100 daily users.
  - Watch MongoDB Atlas metrics: connections, ops/sec, data transfer, storage, slow queries.
  - Upgrade MongoDB before Vercel if live exams become slow under concurrent students.
  - Keep `maxPoolSize` conservative unless real connection pressure says otherwise.

## Priority 5 - UI and Product Polish

Recommended order for this app:

1. Polish mobile layout where students actually use the app.
2. Improve dashboard density gradually.
3. Improve light mode.
4. Replace Font Awesome CDN later.
5. Improve admin UX as you use it more.

- [ ] Improve dashboard density
  - Status: Pending.
  - Reduce overuse of large rounded cards.
  - Use tighter spacing for repeated operational pages like exams, profile, tasks, and admin.
  - Keep the homepage visual identity, but make app pages feel more like a focused student dashboard.

- [ ] Improve light mode
  - Status: Pending.
  - Increase contrast for text and borders.
  - Reduce the one-note indigo/purple feel.
  - Add a few neutral and success/warning accents for clearer hierarchy.

- [ ] Replace Font Awesome CDN later
  - Status: Pending.
  - Use a local icon package such as `lucide-react`.
  - This improves CSP, reduces external dependency risk, and makes icons easier to control.
  - Good cleanup, but not urgent for launch.

- [ ] Polish mobile layout
  - Status: Pending / manual QA.
  - Check bottom nav does not cover important buttons.
  - Add enough bottom padding on long pages.
  - Test exams, tasks, profile, leaderboard, and admin on small screens.

- [ ] Improve admin UX
  - Status: Partial.
  - Good: admin resources and exams already have validation/error messages and confirmation dialogs in several places.
  - Add better validation messages where API details are still generic.
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
  - Add a recurring manual backup habit before the first larger live exam.

- [ ] Analytics dashboard
  - Monthly student progress.
  - Habit consistency.
  - Exam topic weakness.
  - Course/resource usage.

## Current Recommendation

Launch and use the app with your current students as a beta. Priority 0 is treated as complete based on your confirmation. The next practical fixes are:

1. Add leaderboard privacy controls.
2. Add basic smoke tests.
3. Improve remaining empty/error states.
4. Finish rank consistency review.
5. Tighten direct ImageKit upload policy where the dashboard/API allows it.

Avoid payments, roles, complex analytics, and big redesigns until the student workflow is stable.
