# IT Resource Zone / Exam Portal Codebase Audit

Date: 2026-05-23

## Verification Status

- Reviewed the repository structure, Next.js configuration, middleware, API routes, models, auth helpers, validation helpers, resource hub, exam flow, admin routes, and main client pages.
- `npm run lint` passed.
- `npm run build` was skipped because the user asked to skip build.
- `npm audit` was not run, so this report does not claim current dependency CVE status.
- Existing uncommitted file noticed: `jsconfig.json`. This audit did not edit it.

## Executive Summary

The codebase is a real production-oriented Next.js App Router application, not a toy prototype. It has a solid foundation: Clerk user auth, custom admin auth with httpOnly cookies, Mongo/Mongoose models, Zod request validation, server-owned live exam attempts, answer locking for live attempts, Sentry, Vercel Analytics, security headers, same-origin checks on most mutations, rate limiting, public DTOs for resources, and explicit index sync scripts.

The biggest improvement since the older audit is that high-risk exam integrity issues have mostly been addressed. Live exams now require a server attempt, live answers are locked server-side, the submission API derives the student display name from Clerk, public live exam details hide questions until the attempt starts, resource search input is escaped, account deletion removes more user data, and index sync imports all models.

The remaining important issues are now mostly compatibility, scale, and cleanup work:

1. Admin exam mutations still have legacy compatibility routes under `/api/exams/*`.
2. Leaderboard reads still need pagination, caching, or final snapshots before very large cohorts.
3. CSP still depends on some broad provider allowances and Font Awesome is still loaded from a CDN.
4. ImageKit upload auth is still broad, although upload registration now validates size, MIME type, and folder.
5. Profile submission APIs still expose a best-submission summary rather than explicit full attempt history.
6. Admin resource and asset lists still need pagination once content volume grows.
7. Automated behavioral tests are still missing.

Overall assessment: the platform is good for a student learning portal and much stronger than the previous audit suggested. The highest-risk live exam integrity issues are now addressed; the remaining work is mainly scale hardening, dependency cleanup, and route/API clarity.

## Architecture Overview

### Stack

- Framework: Next.js 15 App Router
- UI: React 19, Tailwind CSS, client components, Font Awesome CDN
- Auth:
  - Students: Clerk
  - Admin: custom JWT in `irz_admin_token` httpOnly cookie
- Database: MongoDB through Mongoose
- Monitoring: Sentry
- Analytics: Vercel Analytics
- Rate limiting: Upstash Redis when configured, in-memory fallback otherwise
- Media/resource integrations: ImageKit and YouTube Data API

### Main Route Areas

- Public/student:
  - `/`
  - `/exams`
  - `/exam/[id]`
  - `/leaderboard`
  - `/leaderboard/[id]`
  - `/profile`
  - `/profile/submission/[id]`
  - `/tasks`
  - `/tasks/history`
  - `/resources`
  - `/resources/[slug]`
  - `/resources/watch/[slug]`
- Auth:
  - `/sign-in`
  - `/sign-up`
- Admin:
  - `/admin`
  - `/admin/dashboard`
  - `/admin/exams`
  - `/admin/exam/[id]`
  - `/admin/users`
  - `/admin/resources`

### Main API Areas

- Exams:
  - `app/api/exams/route.js`
  - `app/api/exams/[id]/route.js`
  - `app/api/exams/[id]/questions/route.js`
  - `app/api/exams/[id]/questions/[questionId]/route.js`
  - `app/api/exams/[id]/publish/route.js`
  - `app/api/exams/[id]/submit/route.js`
  - `app/api/exams/[id]/attempts/start/route.js`
  - `app/api/exams/[id]/attempts/[attemptId]/answers/route.js`
  - `app/api/exams/[id]/attempts/[attemptId]/events/route.js`
- Submissions:
  - `app/api/submissions/user/[clerkUserId]/route.js`
  - `app/api/submissions/user/[clerkUserId]/live/route.js`
  - `app/api/submissions/details/[id]/route.js`
- Leaderboards:
  - `app/api/leaderboard/route.js`
  - `app/api/exams/[id]/leaderboard/route.js`
- Account:
  - `app/api/account/route.js`
- Resources:
  - `app/api/resources/route.js`
  - `app/api/resources/categories/route.js`
  - `app/api/resources/progress/route.js`
- Admin:
  - `app/api/admin/login/route.js`
  - `app/api/admin/logout/route.js`
  - `app/api/admin/exams/*`
  - `app/api/admin/users/*`
  - `app/api/admin/resources/*`
  - `app/api/admin/assets/route.js`
  - `app/api/admin/imagekit/auth/route.js`

### Data Models

- `Exam`
- `Question`
- `ExamAttempt`
- `Submission`
- `PlannerData`
- `Resource`
- `ResourceCategory`
- `ResourceProgress`
- `UploadedAsset`
- `AdminAuditLog`

## What Is Already Strong

### Security Strengths

- Admin cookies are httpOnly, `sameSite: 'strict'`, path-scoped to `/`, and secure in production.
- Admin login supports `ADMIN_PASSWORD_HASH` with scrypt.
- Production requires `ADMIN_PASSWORD_HASH` and validates `JWT_SECRET` length.
- Middleware now validates the admin JWT for `/admin/*` routes.
- Most mutating endpoints use `enforceSameOrigin()`.
- Zod validation is used broadly for exams, questions, submissions, attempts, planner data, resources, categories, YouTube imports, ImageKit asset metadata, and progress updates.
- ObjectId route params are validated in most dynamic API routes.
- Live exam display names are now derived server-side from Clerk rather than trusted from the client.
- Live exams now use `ExamAttempt` with server-side answer locking.
- Live submissions use stored attempt answers instead of trusting the submitted answer payload.
- Live duplicate submissions are protected through app logic and a partial unique index.
- Resource public responses now use DTO helpers rather than returning raw documents.
- Resource progress now checks that the resource exists and is published.
- Account deletion removes submissions, planner data, resource progress, and exam attempts.
- Question and option HTML is limited and sanitized.
- Logging redacts common sensitive keys.
- Production error responses are generic.
- Security headers and CSP are configured in `next.config.mjs`.

### Data/Performance Strengths

- Mongo connection caching exists in `lib/db.js`.
- `scripts/ensureIndexes.js` imports all current models and syncs indexes.
- Important indexes exist for exams, questions, submissions, attempts, resources, categories, progress, uploads, and audit logs.
- Resource fetches use `.lean()`, projections, cache headers, and public serializers.
- Admin user list now supports `limit`, `offset`, and query.
- Admin user detail rank lookup uses a batch rank map rather than one leaderboard query per submission.
- Resource asset reference counting now happens inside transactions on create/update/delete.
- Resource deletion cleans related progress.

### Product/UX Strengths

- Live, upcoming, and past exams are separated clearly.
- Past exams can be practiced and reviewed.
- Live exam review is hidden while the live window is active.
- Live answer locking now has a backend source of truth.
- Resources support categories, YouTube watch pages, progress tracking, ImageKit uploads, and playlist import.
- Account/profile, password update, submission history, tasks, and habits are integrated with Clerk identity.
- Admin has screens for exams, questions, users, resources, categories, uploads, and YouTube imports.

## High Priority Findings

### ✅ ~~1. Submission Endpoint Needs Same-Origin Protection~~

Status: Done. `POST /api/exams/[id]/submit` now enforces same-origin requests before rate limiting and mutation logic.

File:

- `app/api/exams/[id]/submit/route.js`

Problem:

The live/practice submission endpoint is a mutating route but does not call `enforceSameOrigin()`. Other sensitive mutations, including attempt start, answer locking, account deletion, admin login, and resource progress, do call it.

Impact:

- CSRF defense is less consistent.
- Clerk cookies and `SameSite` reduce practical risk, but this route should follow the same mutation policy as the rest of the app.
- If browser or auth behavior changes, this endpoint is a high-value target.

Recommendation:

- Add this at the top of `POST`:

```js
const originCheck = enforceSameOrigin(request)
if (originCheck) return originCheck
```

- Import it from `@/lib/requestSecurity`.
- Confirm `navigator.sendBeacon()` still sends the needed origin behavior in production. If not, handle beacon submission through a small dedicated endpoint or adjust the origin helper carefully.

### ✅ ~~2. Live Attempts Can Submit After Attempt Expiry~~

Status: Done. Live submission now rejects attempts after `expiresAt` plus a 30-second grace period and marks the attempt as `expired`.

Files:

- `app/api/exams/[id]/submit/route.js`
- `app/api/exams/[id]/attempts/start/route.js`
- `lib/models/ExamAttempt.js`

Problem:

The answer-locking endpoint rejects answers after `expiresAt`, but the submit endpoint only checks that the attempt is `in_progress` and the exam is still inside the live submission window. It does not reject an attempt whose `expiresAt` has passed.

Example:

- Exam live window: 7:00 PM to 9:00 PM.
- Exam duration: 30 minutes.
- Student starts at 7:00 PM, so `expiresAt` is 7:30 PM.
- If the student has saved answers before 7:30 PM, the current submit route can still submit those answers later while the live window remains open.

Impact:

- The server-side duration limit is incomplete.
- A student can delay submission after their personal timer expires.

Recommendation:

- In live submission, require `attempt.expiresAt >= now` or allow only a small grace period such as 30 seconds.
- If expired, set status to `expired` and return 403.
- Keep the live-end grace separate from attempt-duration grace.

Suggested check:

```js
const attemptGraceEnd = new Date(attempt.expiresAt.getTime() + 30 * 1000)
if (attemptGraceEnd < now) {
  attempt.status = 'expired'
  await attempt.save()
  return NextResponse.json({ error: 'This attempt has expired.' }, { status: 403 })
}
```

### ✅ ~~3. Resuming Existing Attempts Can Return The Wrong Question Order~~

Status: Done. Existing live attempts now return questions in the stored `questionIds` order.

File:

- `app/api/exams/[id]/attempts/start/route.js`

Problem:

When a live attempt already exists, the route returns `questions.map(toPublicQuestion)` from the current exam query. It does not rebuild the response from `existingAttempt.questionIds`.

Impact:

- If questions are reordered while an attempt exists, the resumed UI can show a different order from the attempt's stored `questionIds`.
- The submit route scores using `attempt.questionIds`, so displayed question indexes and scored question indexes can drift.
- This is especially risky if admins edit/reorder questions during an active live exam.

Recommendation:

- For existing attempts, fetch by `existingAttempt.questionIds` and return in that exact order.
- Consider locking published live exams from question edits/reorders once the live window starts.
- Add a guard in admin UI/API: no question mutation when an exam is currently live unless explicitly forced.

### ✅ ~~4. Exam Deletion Leaves ExamAttempt Documents Behind~~

Status: Done. Exam deletion now removes related `ExamAttempt` documents inside the delete transaction.

File:

- `app/api/exams/[id]/route.js`

Problem:

The exam delete transaction removes the exam, questions, and submissions, but does not delete `ExamAttempt` rows for that exam.

Impact:

- Orphaned attempts stay in the database.
- Admin/user state can become harder to reason about.
- Future analytics based on attempts may include deleted exams.

Recommendation:

- Import `ExamAttempt` in the delete route.
- Add this inside the transaction:

```js
await ExamAttempt.deleteMany({ examId: id }).session(session)
```

### ✅ ~~5. Attempt Events Are Unbounded And Not Rate-Limited~~

Status: Done. Attempt events are rate-limited per user/attempt, rejected after expiry, and capped to the most recent 100 events.

File:

- `app/api/exams/[id]/attempts/[attemptId]/events/route.js`

Problem:

The events endpoint pushes every accepted event into `integrityEvents`. It does not rate limit, cap array size, check `expiresAt`, or reject events after the attempt has effectively ended.

Impact:

- A user can spam event writes and grow a document.
- Large embedded arrays can hurt document performance.
- Integrity data becomes noisy and less useful.

Recommendation:

- Add rate limiting by user/attempt.
- Require `expiresAt: { $gt: now }` for normal event recording.
- Cap with `$slice`, for example keep the last 100 events:

```js
$push: {
  integrityEvents: {
    $each: [event],
    $slice: -100,
  },
}
```

- Consider storing a small summary on the attempt, such as `visibilityHiddenCount`, instead of relying only on raw events.

### ✅ ~~6. Practice Submissions Are Unlimited~~

Status: Done. Practice submissions now keep the best attempt per user/exam, increment `attemptCount`, rate-limit repeated practice submits, and clean older duplicate practice rows for that user/exam on the next submit.

File:

- `app/api/exams/[id]/submit/route.js`

Problem:

Past/practice exams can be submitted repeatedly by the same user. The profile route deduplicates submissions per exam for display, but the database still stores every attempt.

Impact:

- Database growth can become noisy.
- Users can unintentionally create many rows.
- Profile/history and admin analytics may need to decide whether practice attempts mean "best score", "latest score", or "all attempts".

Recommendation:

- Decide the product behavior:
  - Keep all practice attempts and add pagination/history.
  - Keep only latest practice attempt per user/exam.
  - Keep best practice attempt plus attempt count.
- Add rate limiting keyed by `userId` and `examId`.
- Consider a separate `PracticeAttempt` model if practice analytics become important.

### ✅ ~~7. Admin Question Import Route Has Error-Handling Gaps~~

Status: Done. The question import route now validates the exam id before body parsing and handles malformed JSON within the route error path.

File:

- `app/api/exams/[id]/questions/route.js`

Problem:

The route reads and validates request JSON before entering its `try` block and before validating the exam ID. Malformed JSON can bypass the local catch block.

Impact:

- Less consistent API errors.
- Harder debugging for admin import failures.

Recommendation:

- Move `request.json()`, Zod validation, and param validation inside the same `try`.
- Validate `id` before parsing larger request bodies.

### ✅ ~~8. CSV Question Parser Has Fragile Column Logic~~

Status: Done. CSV import now requires the exported 8-column format, validates option and correct-index consistency, and supports quoted commas plus escaped quotes.

File:

- `utils/parseQuestions.js`

Problem:

`parseCSV()` accepts lines with as few as 4 fields, but then reads `correct` from `fields[6]` and `explanation` from `fields[7]`. If admins upload CSV rows with fewer than five option columns, the correct index can silently become `0`.

Impact:

- Imported questions can have wrong correct answers.
- Admin may not notice until after publishing.

Recommendation:

- Define one clear CSV format.
- Validate the exact required columns.
- Use a real CSV parser for quoted commas and escaped quotes.
- Return row-level import errors in the admin UI.

## Medium Priority Findings

### ✅ 9. Admin Resource And Category Reorder Does Not Verify The Full Set

Status: Done. Reorder requests now reject duplicate IDs, require all referenced rows to exist, use `bulkWrite()`, and keep resource reorders scoped to a single category.

Files:

- `app/api/admin/resources/reorder/route.js`
- `app/api/admin/resources/categories/reorder/route.js`

Problem:

The reorder routes validate ID shape but do not verify that all IDs exist, are unique beyond schema array validation, or belong to the currently intended category/context.

Impact:

- Admin UI mistakes can silently perform partial reorders.
- Ordering can become inconsistent if the client sends stale IDs.

Recommendation:

- Reject duplicate IDs explicitly.
- Count matched documents and require the count to equal `orderedIds.length`.
- For resources, include `categoryId` in the request and only reorder within that category unless global ordering is intentional.
- Use `bulkWrite()` for cleaner ordered updates.

### 10. Admin Audit Coverage Is Incomplete

Status: Mostly done. Resource/category create-update-delete, resource/category reorder, asset registration, and playlist import actions now write concise audit events. ImageKit auth requests are not logged to avoid noisy per-upload-token audit entries.

Files:

- `lib/auditLog.js`
- `app/api/exams/*`
- `app/api/admin/resources/*`
- `app/api/admin/assets/route.js`

Problem:

Exam create/update/delete/publish and question changes log audit events, but resource/category/upload/playlist actions mostly do not.

Impact:

- Admin changes to learning resources are not traceable.
- Asset uploads and playlist imports can change public content without an audit trail.

Recommendation:

- Add audit logs for:
  - create/update/delete resource
  - reorder resources
  - create/update/delete category
  - reorder categories
  - upload/register asset
  - import playlist
  - request ImageKit upload auth if needed
- Keep the audit entries concise and avoid logging secrets or huge payloads.

### 11. Admin Mutations Are Split Between Public-Looking And Admin API Paths

Status: Partially done. `README.md` now documents the route convention and the compatibility rules for legacy `/api/exams/*` admin mutations. The route migration itself is intentionally deferred because it is a larger compatibility change.

Files:

- `app/api/exams/route.js`
- `app/api/exams/[id]/route.js`
- `app/api/exams/[id]/questions/*`
- `app/api/exams/[id]/publish/route.js`
- `app/api/admin/exams/*`

Problem:

Some admin-only mutations live under `/api/exams/*` while others live under `/api/admin/exams/*`.

Impact:

- Future contributors can miss required auth checks.
- Route ownership is harder to understand.
- It increases review effort when adding new exam features.

Recommendation:

- Move admin mutations under `/api/admin/exams/*`.
- Keep public read and public submit routes under `/api/exams/*`.
- Add a short route convention section to `README.md`.

### ✅ 12. Clerk Optional Mode Is Inconsistent

Status: Done. Clerk is now treated as required: server env validation includes Clerk keys, middleware always protects Clerk-owned routes, sign-in/sign-up always render Clerk, and the exam client no longer has Clerk-less bypass branches.

Files:

- `middleware.js`
- `lib/env.js`
- `components/ThemeProvider.jsx`
- `app/exam/[id]/ExamPageClient.jsx`

Problem:

Server helpers and middleware have some "Clerk not configured" behavior, but the root provider always renders `ClerkProvider`. In practice, the app appears to require Clerk.

Impact:

- Local setup without Clerk may fail in confusing ways.
- Conditional code paths increase complexity without fully supporting Clerk-less mode.

Recommendation:

- Choose one:
  - Make Clerk required and fail fast with clear env errors.
  - Or implement a real no-Clerk provider/auth abstraction.
- If Clerk is required, remove most `hasClerk` branching from client exam code.

### ✅ 13. Mongo Transactions Require The Right Database Deployment

Status: Done. `README.md` now documents that MongoDB must support transactions, such as Atlas or a local replica set.

Files:

- `app/api/exams/[id]/submit/route.js`
- `app/api/account/route.js`
- `app/api/exams/[id]/route.js`
- `app/api/admin/resources/route.js`
- `app/api/admin/resources/[id]/route.js`

Problem:

The app uses Mongo transactions in several places. This is good for consistency, but transactions require a replica set or sharded cluster. MongoDB Atlas is fine, but a local standalone Mongo instance may fail.

Impact:

- Local development setup can break for users who run plain standalone MongoDB.
- Some destructive actions can fail unexpectedly outside Atlas.

Recommendation:

- Document that MongoDB must support transactions.
- Add a local Docker compose example using a replica set if local Mongo is expected.
- Consider graceful non-transaction fallback only for local development if needed.

### ✅ 14. Resource Search Is Escaped But Still Regex-Based

Status: Done for the public resource API. Public resource search now uses Mongo `$text` against the existing text index instead of regex scans.

File:

- `app/api/resources/route.js`

Problem:

The search query is now length-limited and regex-escaped, which fixes the biggest risk. It still scans regex patterns across multiple fields.

Impact:

- It can become slow as resource volume grows.
- The existing text index is not being used.

Recommendation:

- Switch public search to Mongo `$text` with the existing text index.
- Use regex only as a fallback for very small collections.
- Add pagination/cursors before the resource catalog grows.

### 15. Leaderboard Queries Will Need Pagination Or Snapshots

Files:

- `lib/leaderboard.js`
- `app/api/leaderboard/route.js`
- `app/api/exams/[id]/leaderboard/route.js`

Problem:

Leaderboard helpers load and sort all live submissions for the relevant exam set, then dedupe in application code.

Impact:

- Fine for small cohorts.
- Can become expensive with many exams and many students.

Recommendation:

- Add per-exam pagination for leaderboard pages.
- Cache or snapshot final rankings after a live exam ends.
- Consider storing rank metadata after finalization if leaderboard reads become frequent.

### ✅ 16. Rate Limiter Instances Are Recreated Per Call

Status: Done. Upstash limiter instances are now cached by `name/window/max` while keeping the existing in-memory fallback behavior.

File:

- `lib/rateLimit.js`

Problem:

`getUpstashLimiter()` dynamically imports and constructs Redis/Ratelimit objects each time.

Impact:

- Extra overhead on hot API routes.
- More repeated setup work in serverless functions.

Recommendation:

- Cache limiter instances by `name/window/max`.
- Keep the current in-memory fallback for local development.
- Continue requiring persistent rate limiting for admin login and exam submission in production.

### 17. CSP Is Useful But Still Broad

File:

- `next.config.mjs`

Problem:

The CSP still allows `unsafe-inline` and broad image/connect sources. Some of this may be required by Next, Clerk, YouTube, Vercel Analytics, Sentry, Font Awesome, and ImageKit, but it weakens CSP protection.

Impact:

- CSP provides less protection if XSS is introduced later.

Recommendation:

- Tighten in phases using report-only mode first.
- Prefer packaged icons over external Font Awesome CDN.
- Narrow `img-src` and `connect-src` to known domains over time.
- Keep a note for any provider that genuinely needs a broad directive.

### ✅ 18. Public Exam List Could Use Lean And A Public DTO

Status: Done. The public exam list now uses `.lean()` and maps documents through an explicit public DTO.

File:

- `app/api/exams/route.js`

Problem:

The public exams list returns Mongoose documents directly instead of using `.lean()` plus an explicit DTO.

Impact:

- Not a current leak because the `Exam` model is small.
- Future fields could accidentally become public.
- Slightly more serialization overhead.

Recommendation:

- Use `.lean()`.
- Return only `_id`, `title`, `duration`, `liveStart`, `liveEnd`, `published`, `createdAt`, and `updatedAt` as needed.

## Lower Priority / Cleanup Findings

### ✅ 19. Encoding Artifacts Are Visible In Source And UI

Status: Done for the visible footer and touched source comments. The footer copyright now uses an HTML entity, the exam error back link uses an HTML entity, and touched comments/markdown snippets were normalized to ASCII where practical. Remaining non-ASCII text found by search is valid Unicode UI copy or comments rather than mojibake.

Examples:

- `components/AppChrome.jsx` contains a mojibake copyright marker.
- Multiple files contain mojibake arrow/checkmark-style strings and similar artifacts.
- Comments in several files contain mojibake.

Impact:

- UI polish suffers.
- Source readability suffers.
- It can make docs and comments look broken.

Recommendation:

- Normalize files to UTF-8.
- Replace artifacts with either proper Unicode or ASCII:
  - copyright marker -> `(c)` or a real copyright symbol
  - arrow marker -> `->` or a real arrow symbol
  - checkmark marker -> `(done)` or a real checkmark symbol
- Since the project already contains many non-ASCII artifacts, do this as a dedicated cleanup pass.

### ✅ 20. README Still Mentions Next.js 14 In One Place

Status: Done. The README introduction now says Next.js 15.

File:

- `README.md`

Problem:

The README introduction says the app is built with Next.js 14, while `package.json` uses Next.js 15.

Impact:

- Small documentation drift.

Recommendation:

- Update the intro to Next.js 15.

### 21. Font Awesome CDN Adds External Runtime Dependency

File:

- `app/layout.jsx`

Problem:

The app loads Font Awesome from cdnjs in the document head.

Impact:

- External CSS/font dependency affects privacy, reliability, and CSP complexity.
- Icons may fail if CDN is blocked.

Recommendation:

- Prefer an installed icon package or inline local icon system.
- If keeping CDN, consider SRI and exact version pinning.

### 22. ImageKit Upload Auth Is Broad For Admins

Status: Partially done. Admin uploads now validate file size, allowed MIME types, and `/resources` folder scope in both the client upload flow and asset registration schema. The ImageKit auth token itself is still generic because direct-upload scoping is provider/API constrained here.

Files:

- `app/api/admin/imagekit/auth/route.js`
- `lib/imagekit.js`
- `app/admin/resources/page.jsx`

Problem:

The server returns generic ImageKit upload auth for admins. The client then uploads directly to ImageKit.

Impact:

- Admin-only, so this is not public exposure.
- Still broad if an admin session is compromised.

Recommendation:

- Restrict folder, file size, and allowed MIME types where ImageKit supports it.
- Keep server-side validation in `app/api/admin/assets/route.js`.
- Log asset registration and playlist import actions.

### ✅ 23. Resource URLs Allow Plain HTTP

Status: Done. Resource URL validation now accepts HTTPS URLs by default and allows plain HTTP only for localhost development hosts.

File:

- `lib/validation.js`

Problem:

`safeResourceUrl()` allows `http:` and `https:`.

Impact:

- Public links can point to non-TLS resources.
- Users may see browser mixed-content or trust warnings.

Recommendation:

- Prefer `https:` for public resources.
- Allow `http:` only for localhost/dev or explicitly trusted exceptions.

### 24. Profile Submission Deduping Hides Attempt History

File:

- `app/api/submissions/user/[clerkUserId]/route.js`

Problem:

The route sorts by score and submitted time, then returns one submission per exam.

Impact:

- Good for a compact profile summary.
- Not good if users expect full attempt history.

Recommendation:

- Rename the endpoint/variable semantics to "best submissions" or add a full history endpoint.
- Add pagination if all attempts are exposed.

### 25. Several Admin Routes Have Fixed Hard Limits

Examples:

- Admin resources limit: 500
- Public resources limit max: 200
- Admin assets limit: 100

Impact:

- Fine now.
- Becomes awkward when content grows beyond the hard cap.

Recommendation:

- Add pagination or cursor-based loading to admin resources/assets.
- Keep sensible default limits.

## Security Review

### Authentication

Student auth is Clerk-backed and user-scoped APIs check identity. Admin auth is separate and uses a signed JWT cookie. The separation is good. The biggest auth cleanup is deciding whether Clerk is truly required, then removing partial optional-Clerk paths if it is.

### Authorization

Most admin routes call `requireAdmin()`. User-specific routes use `requireUserOrAdmin()` where appropriate. Resource progress uses the Clerk user from `auth()`. This is generally solid.

### CSRF / Same-Origin

The app has a good helper and applies it widely. The main miss is `POST /api/exams/[id]/submit`. Add it there for consistency.

### Input Validation

Zod usage is strong. Remaining gaps are mostly around helper parsers and route ordering:

- Move JSON parsing inside `try` in question import.
- Strengthen CSV parser validation.
- Validate reorder IDs against actual matched records.

### XSS

Question HTML is restricted and sanitized client-side. `dangerouslySetInnerHTML` is used intentionally with `safeHTML`. This is acceptable given the current allowed tag list.

### Data Privacy

Account deletion now removes the key local user-owned records. Decide whether deleted users' leaderboard history should be deleted, anonymized, or retained; current behavior deletes submissions.

### Admin Auditability

The audit model exists and exam actions use it. Expand it to resources, categories, assets, and imports.

## Performance Review

The app is currently optimized enough for a small-to-medium educational platform. The main scaling risks are:

- Leaderboards loading and sorting all submissions.
- Regex resource search.
- Hard-capped admin lists instead of pagination.
- Unlimited practice submission storage.
- Rate limiter construction per request.
- Embedded `integrityEvents` arrays growing without bounds.

Recommended performance improvements:

1. Cache/rank snapshot leaderboards after live exams end.
2. Use Mongo text search or a dedicated search layer for resources.
3. Add cursor/pagination to admin resources, assets, and public leaderboards.
4. Cache Upstash limiter instances.
5. Cap attempt event arrays.
6. Add retention or dedupe strategy for practice submissions.

## Testing Gaps

There are no obvious automated tests in the repository. Lint passing is helpful, but it does not verify security or behavior.

Add focused tests for:

### Exam Integrity

- Live attempt start only during active live window.
- Existing attempt resumes with stored question order.
- Answer cannot be changed after first lock.
- Answer cannot be saved after `expiresAt`.
- Submission rejects expired attempts.
- Duplicate live submission returns 409.
- Live submission derives student name from Clerk.
- Exam deletion removes attempts.

### API Security

- Submission rejects invalid origin after adding same-origin check.
- Admin login rate limit works.
- Admin routes reject invalid/expired cookies.
- User cannot read another user's submissions.
- Resource progress rejects unpublished/missing resources.
- Account deletion removes all expected user-owned collections.

### Admin Workflows

- Create/update/delete/publish exam.
- Add/import/delete/reorder questions.
- CSV import row validation.
- Create/update/delete/reorder resources and categories.
- Playlist import handles duplicates.
- Asset upload registration dedupes by hash.

### UI Flows

- Unauthenticated user is sent to sign-in before exam.
- Live exam hides questions before attempt start.
- Tab switch records an event and submits.
- Past exam review shows answers.
- Resource progress resumes.
- Profile delete-account flow works.

## Prioritized Roadmap

### Immediate

1. Add focused tests for live attempt lifecycle, submission security, and practice retention.
2. Add pagination/cursors for admin resources/assets and public leaderboard.
3. Decide whether profile APIs should expose full attempt history in addition to best submissions.

### Short Term

1. Move legacy admin exam mutations under `/api/admin/exams/*` with compatibility redirects or client updates.
2. Tighten CSP in report-only mode first.
3. Replace Font Awesome CDN with a local/package icon system.
4. Add leaderboard snapshots after live exams end.

### Medium Term

1. Add deeper admin audit reporting views.
2. Add cursor-based loading to any admin screen that still assumes small datasets.
3. Revisit ImageKit direct upload policy if stricter signed-upload constraints are available.

## Final Assessment

The codebase is much healthier than the older audit implied. The most dangerous earlier issues are fixed: live attempts exist, live answers lock server-side, display names are trusted from Clerk, resource APIs use DTOs, account deletion is more complete, index sync covers current models, and the live attempt expiry/resume/event/CSRF gaps have been closed.

The app is ready for normal educational use. For serious live exams with large cohorts, the next meaningful step is automated behavioral tests plus leaderboard pagination or snapshots.
