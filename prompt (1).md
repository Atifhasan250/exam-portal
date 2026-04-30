# IT Resource Zone — Full Audit & Fix Guide for AI Agent

> **Context**: This is a React 19 + Express 4 + MongoDB + Tailwind CSS exam portal deployed on Vercel free tier. It has ~20–30 users, no auth for students (localStorage identity), and a JWT-protected admin area. The goal is production-quality polish, performance, security, and polished UI animations — without overengineering for the current scale.

---

## SECTION 1 — PERFORMANCE PROBLEMS

### Problem 1.1 — Cold Start Latency (Homepage & Leaderboard slow to load)

**Root Cause**: Vercel serverless functions (free tier) go "cold" after inactivity. Every `connectDB()` call in `api/index.js` opens a new MongoDB connection on cold start, adding 1–3 seconds of latency. The homepage and leaderboard both make API calls that hit cold functions.

**Fix — `lib/db.js`**: The current code already caches the connection in `global.mongoose`, which is correct. The remaining latency is pure cold start. Add a lightweight "keep-alive" ping mechanism on the frontend:

```js
// In src/main.jsx, add this after createRoot render:
// Ping the API on app mount to wake up the serverless function early
fetch('/api/exams').catch(() => {});
```

**Fix — Vercel config**: Add this to `vercel.json` to reduce cold start frequency:
```json
{
  "functions": {
    "api/index.js": {
      "maxDuration": 10
    }
  }
}
```

**Fix — Stale-While-Revalidate caching in the frontend**: In `HomePage.jsx` and `ExamsPage.jsx`, cache the last known exams list in `sessionStorage` and show it instantly while the fresh fetch loads in the background:

```js
// At the top of the useEffect that fetches /api/exams:
const cached = sessionStorage.getItem('exams_cache');
if (cached) {
  setExams(JSON.parse(cached));
  setLoading(false); // show cached data immediately
}
fetch('/api/exams')
  .then(r => r.json())
  .then(data => {
    const arr = Array.isArray(data) ? data : [];
    setExams(arr);
    sessionStorage.setItem('exams_cache', JSON.stringify(arr));
    setLoading(false);
  })
  .catch(() => setLoading(false));
```

Apply the same pattern to `Leaderboard.jsx` with key `leaderboard_cache`.

---

### Problem 1.2 — Duplicate API Route in `api/index.js`

**Root Cause**: There are TWO `app.put('/api/exams/:id', ...)` route handlers registered (lines ~56 and ~70). Express uses the FIRST match, so the second one (which sets `title, duration, liveStart, liveEnd`) is silently dead code.

**Fix**: Remove the first duplicate `PUT /api/exams/:id` handler (the one that just calls `findByIdAndUpdate(req.params.id, req.body, { new: true })`). Keep only the second one that explicitly destructures `{ title, duration, liveStart, liveEnd }`. This makes the update endpoint safe against arbitrary field injection.

---

### Problem 1.3 — N+1 Query in Leaderboard

**Root Cause**: In `GET /api/leaderboard`, there is a `for...of` loop that calls `Submission.find(...)` once per exam. With 10 exams, this is 11 sequential DB queries.

**Fix**: Replace the loop with a single batched query:

```js
app.get('/api/leaderboard', async (req, res) => {
  try {
    await connectDB();
    const exams = await Exam.find({ published: true, liveStart: { $exists: true } }, { questions: 0 }).sort({ liveEnd: -1 }).lean();
    const examIds = exams.map(e => e._id);

    const submissions = await Submission.find({ examId: { $in: examIds }, wasLive: true })
      .sort({ score: -1, submittedAt: 1 })
      .lean();

    // Group by examId, deduplicate by studentName
    const grouped = {};
    for (const sub of submissions) {
      const key = sub.examId.toString();
      if (!grouped[key]) grouped[key] = { seen: new Set(), list: [] };
      if (!grouped[key].seen.has(sub.studentName)) {
        grouped[key].seen.add(sub.studentName);
        grouped[key].list.push(sub);
      }
    }

    const data = exams
      .map(exam => ({ exam, submissions: grouped[exam._id.toString()]?.list || [] }))
      .filter(d => d.submissions.length > 0);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

### Problem 1.4 — No MongoDB Indexes

**Root Cause**: `Question` and `Submission` models are queried heavily but only `Question.examId` has an index defined. Missing indexes cause full collection scans.

**Fix**: Add indexes to `lib/models/Submission.js`:

```js
const SubmissionSchema = new mongoose.Schema({ ... });
SubmissionSchema.index({ examId: 1, wasLive: 1 });
SubmissionSchema.index({ studentName: 1, submittedAt: -1 });
SubmissionSchema.index({ examId: 1, studentName: 1 });
```

Add to `lib/models/Exam.js`:
```js
ExamSchema.index({ published: 1, liveEnd: -1 });
```

---

### Problem 1.5 — No HTTP Caching Headers

**Root Cause**: All API responses have no cache headers. Public data (exam list, leaderboard) is fetched fresh on every page visit.

**Fix**: Add cache headers to stable public endpoints in `api/index.js`:

```js
// GET /api/exams — cache for 30 seconds on CDN, 60s stale-while-revalidate
app.get('/api/exams', async (req, res) => {
  res.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
  // ... rest of handler
});

// GET /api/leaderboard — cache for 60 seconds
app.get('/api/leaderboard', async (req, res) => {
  res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  // ... rest of handler
});
```

---

## SECTION 2 — SECURITY ISSUES

### Problem 2.1 — No Rate Limiting (CRITICAL)

**Root Cause**: The admin login endpoint `POST /api/admin/login` has no rate limiting. An attacker can brute-force the password with unlimited attempts.

**Fix**: Install `express-rate-limit`:
```bash
npm install express-rate-limit
```

Add to `api/index.js`:
```js
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply ONLY to the login route:
app.post('/api/admin/login', loginLimiter, (req, res) => { ... });
```

Also add a general API rate limiter:
```js
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many requests.' }
});
app.use('/api/', apiLimiter);
```

---

### Problem 2.2 — XSS via `dangerouslySetInnerHTML`

**Root Cause**: In `ExamPage.jsx`, `AdminExamView.jsx`, and `SubmissionDetails.jsx`, question text and option text are rendered via `dangerouslySetInnerHTML={{ __html: q.question }}`. If an admin stores a question containing `<script>alert(1)</script>`, it executes in every student's browser.

**Fix**: Install a sanitizer:
```bash
npm install dompurify
```

Create `src/utils/sanitize.js`:
```js
import DOMPurify from 'dompurify';

export function safeHTML(dirty) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'br', 'sub', 'sup'],
    ALLOWED_ATTR: []
  });
}
```

Replace every `dangerouslySetInnerHTML={{ __html: q.question }}` with:
```jsx
dangerouslySetInnerHTML={{ __html: safeHTML(q.question) }}
```

Apply to: question text, option text, and explanations in `ExamPage.jsx`, `AdminExamView.jsx`, `SubmissionDetails.jsx`.

---

### Problem 2.3 — JWT Secret Fallback Risk

**Root Cause**: If `process.env.JWT_SECRET` is undefined (misconfigured deployment), `jwt.sign()` and `jwt.verify()` will still run with `undefined` as the secret, which may produce tokens that are trivially forgeable depending on the JWT library version.

**Fix**: Add a startup guard in `api/index.js`:
```js
// At the top, after imports:
const REQUIRED_ENV = ['MONGO_URI', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'JWT_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: Missing environment variable: ${key}`);
    process.exit(1);
  }
}
```

---

### Problem 2.4 — CORS is Wide Open

**Root Cause**: `app.use(cors())` with no options allows any origin to call your API.

**Fix**:
```js
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://it-resource-zone.vercel.app']
    : ['http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
```

---

### Problem 2.5 — Student Name as Identity (Impersonation)

**Root Cause**: Submissions are tied to `studentName` (a plain string from localStorage). Any student can change their name to another student's name and pollute their history or leaderboard position. This is a known accepted tradeoff (no login by design).

**Soft Fix (recommended for future, not required now)**: Generate a random `student_id` UUID in localStorage on first visit and store it alongside the name. Send both to the submission API. Filter profile history by `student_id` instead of name. This prevents impersonation without requiring login. Implement this when users exceed 50.

---

### Problem 2.6 — No Input Validation on Question Import

**Root Cause**: The `POST /api/exams/:id/questions` endpoint accepts any `questions` array from the admin with no server-side validation.

**Fix**: Add validation in the POST handler:
```js
app.post('/api/exams/:id/questions', auth, async (req, res) => {
  const questions = req.body.questions;
  if (!Array.isArray(questions) || questions.length === 0)
    return res.status(400).json({ error: 'questions must be a non-empty array' });

  for (const [i, q] of questions.entries()) {
    if (!q.question || typeof q.question !== 'string')
      return res.status(400).json({ error: `Question ${i+1}: missing question text` });
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 5)
      return res.status(400).json({ error: `Question ${i+1}: must have 2-5 options` });
    if (typeof q.correct !== 'number' || q.correct < 0 || q.correct >= q.options.length)
      return res.status(400).json({ error: `Question ${i+1}: invalid correct index` });
  }
  // ... rest of handler
});
```

---

## SECTION 3 — DESIGN BUGS & UX ISSUES

### Problem 3.1 — Theme Duplication Across Pages (Code Smell + Bug)

**Root Cause**: Every page component has its own copy of `const [theme, setTheme] = useState(...)` and `toggleTheme()`. This is 6+ copies of identical logic. The `theme` state is not synchronized between components.

**Fix**: Move theme to a React Context.

Create `src/context/ThemeContext.jsx`:
```jsx
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeCtx = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    if (document.startViewTransition) {
      document.documentElement.style.setProperty('--tx', `${x}px`);
      document.documentElement.style.setProperty('--ty', `${y}px`);
      document.documentElement.style.setProperty('--tr', `${endRadius}px`);
      document.startViewTransition(() => setTheme(t => t === 'dark' ? 'light' : 'dark'));
    } else {
      setTheme(t => t === 'dark' ? 'light' : 'dark');
    }
  };

  return <ThemeCtx.Provider value={{ theme, toggleTheme }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
```

Wrap `<App />` in `main.jsx` with `<ThemeProvider>`. Replace all per-page theme state with `const { theme, toggleTheme } = useTheme()`. Delete all duplicated theme state and logic from every page file.

---

### Problem 3.2 — `BottomNav` Reads `localStorage` Outside React State

**Root Cause**: `BottomNav.jsx` calls `localStorage.getItem('student_name')` at the top level of the component (not in state). If the student sets their name for the first time, the Profile tab won't appear until a page reload.

**Fix**:
```jsx
const [studentName, setStudentName] = useState(() => localStorage.getItem('student_name') || '');

useEffect(() => {
  const handler = () => setStudentName(localStorage.getItem('student_name') || '');
  window.addEventListener('student_name_changed', handler);
  return () => window.removeEventListener('student_name_changed', handler);
}, []);
```

Dispatch `window.dispatchEvent(new Event('student_name_changed'))` everywhere `localStorage.setItem('student_name', ...)` is called (in `Navbar.jsx`, `HomePage.jsx`, `ExamsPage.jsx`, `ProfilePage.jsx`).

---

### Problem 3.3 — Exam Timer Can Run After Unmount (Memory Leak)

**Root Cause**: In `ExamPage.jsx`, if the user navigates away during an exam, the `setInterval` keeps running and calls `submitExam()` on an unmounted component.

**Fix**:
```js
useEffect(() => {
  return () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
}, []);
```

---

### Problem 3.4 — Anti-Cheat Tab Switch Is Missing From Code

**Root Cause**: The README claims "Tab switching triggers automatic exam submission" but no such code exists in `ExamPage.jsx`. The `visibilitychange` event listener is entirely missing.

**Fix**: Add to `ExamPage.jsx`:
```js
useEffect(() => {
  if (screen !== 'exam') return;

  const handleVisibilityChange = () => {
    if (document.hidden) {
      showToast('Tab switch detected. Exam will be submitted.');
      setTimeout(() => submitExam(), 3500);
    }
  };

  const blockContext = (e) => e.preventDefault();
  const blockKeys = (e) => {
    if ((e.ctrlKey || e.metaKey) && ['c','v','p','a','s','u'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('contextmenu', blockContext);
  document.addEventListener('keydown', blockKeys);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('contextmenu', blockContext);
    document.removeEventListener('keydown', blockKeys);
  };
}, [screen]);
```

---

### Problem 3.5 — `GET /api/exams/:id` Returns Unpublished Exams to Public

**Root Cause**: The public single-exam endpoint has no `published: true` check. A student who guesses an exam's ObjectId can read a draft exam and its questions.

**Fix**:
```js
app.get('/api/exams/:id', async (req, res) => {
  try {
    await connectDB();
    const exam = await Exam.findOne({ _id: req.params.id, published: true }).lean();
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    const questions = await Question.find({ examId: exam._id }).sort({ order: 1 }).lean();
    res.json({ ...exam, questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

### Problem 3.6 — Profile Shows First Score Instead of Best Score

**Root Cause**: In `GET /api/submissions/:name`, deduplication sorts by `submittedAt: -1` and keeps the most recent attempt, not necessarily the best score.

**Fix**: Sort by `score: -1, submittedAt: -1` before deduplication so the best score per exam is always shown:
```js
const submissions = await Submission.find({ studentName: req.params.name })
  .populate('examId', 'title')
  .sort({ score: -1, submittedAt: -1 });
```

---

### Problem 3.7 — Admin Uses `confirm()` for Question Deletion

**Root Cause**: `AdminExamView.jsx` uses a native `confirm()` dialog which is visually inconsistent and blocked in some embedded browser contexts.

**Fix**: Add a `questionToDelete` state (set to the question index) and render a custom confirmation modal matching the style of the exam delete modal already present in `AdminDashboard.jsx`. Remove the `confirm()` call entirely.

---

### Problem 3.8 — Double Submission Possible on Slow Networks

**Root Cause**: The submit button in `ExamPage.jsx` does not disable after the first click.

**Fix**:
```jsx
const [submitting, setSubmitting] = useState(false);

const submitExam = async () => {
  if (submitting) return;
  setSubmitting(true);
  // ... rest of submit logic
};

// In the confirm modal:
<button onClick={submitExam} disabled={submitting}>
  {submitting ? 'Submitting...' : 'Confirm'}
</button>
```

---

## SECTION 4 — ANIMATIONS

All animations must respect `prefers-reduced-motion`. Add the following as the absolute last rule in `src/index.css` and never place any animation rule after it:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Use `transform` and `opacity` exclusively for all animations. Never animate `width`, `height`, `top`, `left`, or `margin`. Default easing: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out expo). Spring easing: `cubic-bezier(0.34, 1.56, 0.64, 1)`.

---

### Animation 4.1 — Bottom Nav Sliding Pill (Mobile)

**Target file**: `src/components/BottomNav.jsx`

**What it does**: When the user taps a nav item, a background pill slides horizontally to the new item with a spring bounce. This replaces the current static active-class swap.

**Implementation**: Use a shared absolutely-positioned `<span>` pill element that is repositioned via `transform: translateX(...)` whenever the active route changes. Track the active item's bounding rect using a `useEffect` on `location.pathname`.

```jsx
import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

export default function BottomNav() {
  const [studentName, setStudentName] = useState(() => localStorage.getItem('student_name') || '');
  const location = useLocation();
  const navRef = useRef(null);
  const pillRef = useRef(null);

  useEffect(() => {
    const handler = () => setStudentName(localStorage.getItem('student_name') || '');
    window.addEventListener('student_name_changed', handler);
    return () => window.removeEventListener('student_name_changed', handler);
  }, []);

  const navItems = [
    { to: '/', icon: 'fa-house', label: 'Home', exact: true },
    { to: '/exams', icon: 'fa-layer-group', label: 'Exams' },
    { to: '/leaderboard', icon: 'fa-trophy', label: 'Ranks' },
    ...(studentName ? [{ to: '/profile', icon: 'fa-user', label: 'Profile' }] : []),
  ];

  useEffect(() => {
    if (!navRef.current || !pillRef.current) return;
    const activeEl = navRef.current.querySelector('[data-active="true"]');
    if (!activeEl) return;
    const navRect = navRef.current.getBoundingClientRect();
    const itemRect = activeEl.getBoundingClientRect();
    pillRef.current.style.width = `${itemRect.width}px`;
    pillRef.current.style.transform = `translateX(${itemRect.left - navRect.left}px)`;
  }, [location.pathname, studentName]);

  return (
    <nav className="sm:hidden fixed bottom-3 left-3 right-3 z-50">
      <div
        ref={navRef}
        className="relative flex items-center justify-around px-2 py-1.5 rounded-2xl shadow-2xl"
        style={{
          background: 'color-mix(in srgb, var(--color-surface) 80%, transparent)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}
      >
        <span
          ref={pillRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '6px',
            left: 0,
            height: 'calc(100% - 12px)',
            borderRadius: '12px',
            background: 'var(--color-accent)',
            transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        {navItems.map(({ to, icon, label, exact }) => {
          const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={exact}
              data-active={isActive ? 'true' : 'false'}
              className="relative z-10 flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-colors duration-200 flex-1"
              style={{ color: isActive ? '#ffffff' : 'var(--color-secondary)' }}
            >
              <i className={`fas ${icon} text-sm`}></i>
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
```

---

### Animation 4.2 — Page Entry Fade-Up (All Student Pages)

**Target file**: `src/index.css` (add keyframe + class), then `src/pages/HomePage.jsx`, `src/pages/ExamsPage.jsx`, `src/pages/Leaderboard.jsx`, `src/pages/ProfilePage.jsx`, `src/pages/SubmissionDetails.jsx` (add class to outermost div).

**What it does**: Every student-facing page fades up from 16px below when it mounts. This makes every route transition feel deliberate instead of jarring.

Add to `src/index.css`:
```css
@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-enter {
  animation: page-enter 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}
```

Add `page-enter` to the outermost `<div>` of each of those five page components. Example:
```jsx
<div className="bg-theme-bg min-h-screen text-theme-primary transition-theme page-enter">
```

Do NOT add `page-enter` to `ExamPage.jsx` (abrupt entry is intentional for exam start) or to any admin pages.

---

### Animation 4.3 — Card Stagger Entrance (Exam Cards & Leaderboard Rows)

**Target files**: `src/index.css`, `src/pages/ExamsPage.jsx`, `src/pages/Leaderboard.jsx`

**What it does**: Exam cards and leaderboard rows animate in one by one with a cascading delay, drawing the eye naturally down the list.

Add to `src/index.css`:
```css
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.card-enter {
  animation: card-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}
```

In `ExamsPage.jsx`, add an `index` prop to `ExamCard` and apply the animation with inline delay:
```jsx
function ExamCard({ exam, badge, badgeColor, fmtDate, onStart, disabled, disabledLabel, index = 0 }) {
  return (
    <div
      className="card-enter bg-theme-surface border border-theme-border rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-theme-accent/40 transition-all"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      ...
    </div>
  );
}
```

Pass `index` when mapping each section:
```jsx
{liveExams.map((exam, i) => <ExamCard key={exam._id} ... index={i} />)}
{pastExams.map((exam, i) => <ExamCard key={exam._id} ... index={i} />)}
{upcomingExams.map((exam, i) => <ExamCard key={exam._id} ... index={i} />)}
```

In `Leaderboard.jsx`, add `card-enter` and `animationDelay` to each submission row:
```jsx
<div
  key={sub._id}
  className="card-enter grid grid-cols-12 gap-2 px-3 sm:px-5 py-3.5 ..."
  style={{ animationDelay: `${idx * 60}ms` }}
>
```

---

### Animation 4.4 — Score Counter Roll-Up (Result Screen)

**Target file**: `src/pages/ExamPage.jsx`

**What it does**: When the result screen appears, the score number counts up from 0 to the final value over ~900ms using an ease-out cubic curve. Makes the score reveal feel rewarding.

Add the following hook inside `ExamPage.jsx`, defined outside the component function:
```js
function useCountUp(target, duration = 900) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return current;
}
```

In `ResultScreen`, consume the hook and replace the static score display:
```jsx
function ResultScreen({ result, studentName, onBack }) {
  const displayScore = useCountUp(result.score, 900);
  // ...
  // Replace static score line with:
  <p className="text-6xl font-black text-theme-accent">
    {displayScore}<span className="text-3xl text-theme-secondary">/{result.total}</span>
  </p>
}
```

---

### Animation 4.5 — Answer Option Select Pulse

**Target files**: `src/index.css`, `src/pages/ExamPage.jsx`

**What it does**: When a student taps an answer option, it briefly scales up by 2.5% then settles back — a satisfying micro-confirmation that the tap registered.

Add to `src/index.css`:
```css
@keyframes option-select {
  0%   { transform: scale(1); }
  35%  { transform: scale(1.025); }
  100% { transform: scale(1); }
}

.option-selected-anim {
  animation: option-select 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
```

In `ExamPage.jsx`, add state to track the last selected option per question:
```js
const [lastSelected, setLastSelected] = useState({});
```

Modify `saveAnswer` to also update `lastSelected`:
```js
const saveAnswer = (qIdx, oIdx) => {
  if (answers[qIdx] !== undefined) return;
  setAnswers(prev => ({ ...prev, [qIdx]: oIdx }));
  setLastSelected(prev => ({ ...prev, [qIdx]: oIdx }));
};
```

On the option `<label>` element, add the animation class and remove it after it completes:
```jsx
<label
  key={oi}
  className={`${cls} ${lastSelected[qi] === oi ? 'option-selected-anim' : ''}`}
  onClick={() => saveAnswer(qi, oi)}
  onAnimationEnd={() => setLastSelected(prev => {
    const n = { ...prev };
    delete n[qi];
    return n;
  })}
>
```

---

### Animation 4.6 — Timer Danger Pulse (Enhance Existing)

**Target files**: `src/index.css`, `src/pages/ExamPage.jsx`

**What it does**: The existing timer uses Tailwind's `animate-pulse` when under 60 seconds. Replace it with a custom scale-pulse that also emits a faint red glow ring — more dramatic and impossible to miss.

Add to `src/index.css`:
```css
@keyframes timer-danger {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
  }
  50% {
    transform: scale(1.06);
    box-shadow: 0 0 0 6px rgba(220, 38, 38, 0.15);
  }
}

.timer-danger {
  animation: timer-danger 0.9s ease-in-out infinite;
}
```

In `ExamPage.jsx`, replace `animate-pulse` on the timer element with `timer-danger`:
```jsx
className={`font-mono text-base font-bold px-3 py-1 rounded-full border ${
  pulse
    ? 'timer-danger bg-theme-error-bg text-theme-error-text border-theme-error-border'
    : 'bg-indigo-50 dark:bg-indigo-500/10 text-theme-accent border-indigo-200 dark:border-indigo-500/20'
}`}
```

---

### Animation 4.7 — Modal Entry Animation (All Modals)

**Target file**: `src/index.css`, then every modal in the codebase.

**What it does**: Every modal overlay and panel currently appears instantly. A backdrop fade-in and panel scale-up make them feel deliberate and premium.

Add to `src/index.css`:
```css
@keyframes modal-backdrop {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes modal-enter {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-backdrop {
  animation: modal-backdrop 0.2s ease both;
}

.modal-panel {
  animation: modal-enter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
```

Apply to every modal in the codebase. The modals exist in: `ExamPage.jsx` (submit confirm modal), `ExamsPage.jsx` (name modal), `HomePage.jsx` (name modal), `Navbar.jsx` (edit name modal), `AdminDashboard.jsx` (create exam modal, add questions modal, delete exam modal), `ProfilePage.jsx` (edit name modal).

For each modal, add `modal-backdrop` to the fixed overlay div and `modal-panel` to the inner card div:
```jsx
{/* Fixed overlay: */}
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 modal-backdrop">
  {/* Inner card: */}
  <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 max-w-sm w-full shadow-2xl modal-panel">
```

---

### Animation 4.8 — Skeleton Loading Screens (Replace Spinners)

**Target files**: `src/index.css`, `src/pages/ExamsPage.jsx`, `src/pages/Leaderboard.jsx`, `src/pages/ProfilePage.jsx`

**What it does**: Replace the single spinning circle loader with content-shaped skeleton placeholders. Skeletons match the layout of the actual content, dramatically reducing perceived load time.

Add to `src/index.css`:
```css
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position: 600px 0; }
}

.skeleton {
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    var(--color-border) 25%,
    var(--color-surface) 50%,
    var(--color-border) 75%
  );
  background-size: 600px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
```

In `ExamsPage.jsx`, replace the loading spinner `<div>` with:
```jsx
{loading ? (
  <div className="space-y-14">
    {[0, 1].map(section => (
      <div key={section} className="space-y-5">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid sm:grid-cols-2 gap-5">
          {[0, 1].map(i => (
            <div key={i} className="bg-theme-surface border border-theme-border rounded-2xl p-6 space-y-4">
              <div className="skeleton h-6 w-3/4 rounded-lg" />
              <div className="skeleton h-4 w-1/2 rounded-lg" />
              <div className="skeleton h-4 w-2/3 rounded-lg" />
              <div className="skeleton h-11 w-full rounded-xl mt-4" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
) : (
  /* existing exam sections unchanged */
)}
```

In `Leaderboard.jsx`, replace the loading spinner with:
```jsx
{loading ? (
  <div className="space-y-5">
    <div className="skeleton h-10 w-64 rounded-xl" />
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {[0, 1, 2].map(i => (
        <div key={i} className="bg-theme-surface border border-theme-border rounded-2xl p-6 space-y-3">
          <div className="skeleton h-6 w-3/4 rounded-lg" />
          <div className="skeleton h-4 w-1/2 rounded-lg" />
          <div className="skeleton h-4 w-2/3 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
) : (
  /* existing leaderboard content unchanged */
)}
```

In `ProfilePage.jsx`, replace the loading spinner with:
```jsx
{loading ? (
  <div className="space-y-4">
    {[0, 1, 2].map(i => (
      <div key={i} className="bg-theme-surface border border-theme-border rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="skeleton h-5 w-2/3 rounded-lg" />
          <div className="skeleton h-4 w-1/3 rounded-lg" />
        </div>
        <div className="skeleton h-10 w-20 rounded-xl" />
      </div>
    ))}
  </div>
) : (
  /* existing submissions list unchanged */
)}
```

---

### Animation 4.9 — Leaderboard Rank Badge Pop (Top 3)

**Target files**: `src/index.css`, `src/pages/Leaderboard.jsx`

**What it does**: The top 3 rank badges (crown, medal, award icon) spring into view with a rotation pop when the leaderboard table renders. Makes the top positions feel earned and celebratory.

Add to `src/index.css`:
```css
@keyframes rank-pop {
  0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
  60%  { transform: scale(1.2) rotate(5deg);  opacity: 1; }
  100% { transform: scale(1)   rotate(0deg);  opacity: 1; }
}

.rank-pop {
  animation: rank-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
```

In `Leaderboard.jsx`, add the `rank-pop` class and staggered delay to rank badge `<span>` elements for ranks 1–3 only:
```jsx
<span
  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${getRankStyle(rank)} ${rank <= 3 ? 'rank-pop' : ''}`}
  style={rank <= 3 ? { animationDelay: `${(rank - 1) * 120}ms` } : {}}
>
  {rank <= 3 ? <i className={getRankIcon(rank)}></i> : rank}
</span>
```

---

## SECTION 5 — CHOSEN COLOR PALETTE

**Palette 1 — Aurora Slate (Light) + Midnight Indigo (Dark)**

Apply by replacing only the `:root` and `.dark` CSS variable blocks in `src/index.css`. Do not modify any other part of `src/index.css` or any other file for this change.

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

---

## SECTION 6 — ADDITIONAL SMALL FIXES

### Fix 6.1 — Add `robots.txt` and `sitemap.xml` to `public/`

The `vercel.json` already has response headers for these files but neither file exists in the repository. Create `public/robots.txt`:
```
User-agent: *
Allow: /
Disallow: /admin
Sitemap: https://it-resource-zone.vercel.app/sitemap.xml
```

Create `public/sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://it-resource-zone.vercel.app/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://it-resource-zone.vercel.app/exams</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>https://it-resource-zone.vercel.app/leaderboard</loc><changefreq>daily</changefreq><priority>0.8</priority></url>
</urlset>
```

---

### Fix 6.2 — Add `autocomplete="off"` to Admin Textarea Inputs

In `AdminDashboard.jsx` `AddQuestionsModal`, add `autoComplete="off" spellCheck="false"` to both the TXT and JSON `<textarea>` elements to prevent browser autofill from corrupting the input.

---

### Fix 6.3 — Scroll to Top on Screen Change in ExamPage

Add this inside `ExamPage.jsx`:
```js
useEffect(() => { window.scrollTo(0, 0); }, [screen]);
```

---

### Fix 6.4 — Admin Question Deletion: Replace `confirm()` with Custom Modal

In `AdminExamView.jsx`, remove `if (!confirm(...))`. Add `const [questionToDelete, setQuestionToDelete] = useState(null)` state. Replace the direct `deleteQuestion(idx)` call with `setQuestionToDelete(idx)`. Render a custom confirmation modal (matching the style in `AdminDashboard.jsx`) that calls the actual delete when confirmed and resets state on cancel.

---

## SECTION 7 — README REWRITE

Rewrite `README.md` completely from scratch. Requirements:

- No emoji anywhere in the file. No decorative separators. Plain Markdown only.
- Professional tone suitable for a technical document.
- Accurate to the current codebase — do not describe features that do not exist or omit features that do.

Structure the new README with the following sections in this exact order:

**1. Project title and one-paragraph description**: IT Resource Zone is an online examination platform for IT students and professionals. It supports live scheduled exams with a one-attempt-per-window policy, practice mode for expired exams with unlimited attempts, a countdown timer with auto-submit, locked answer selection, post-exam answer review with explanations, real-time leaderboards for live exam results, a student profile with exam history, detailed submission review for live attempts, and a JWT-protected admin dashboard for managing exams, questions, and publication status. The application is deployed on Vercel free tier as a single repository containing a React frontend and an Express serverless backend.

**2. Table of Contents** — links to all sections below.

**3. Features** — two subsections, Student-Facing and Admin Dashboard, written as prose paragraphs (not bullet lists). Cover every feature listed in the description above. Do not invent features not present in the code.

**4. Tech Stack** — a Markdown table with columns: Layer, Technology. Include: Frontend (React 19, React Router 6, Vite), Styling (Tailwind CSS via CDN, CSS custom properties), Backend (Express 4, Vercel serverless), Database (MongoDB, Mongoose 8), Authentication (jsonwebtoken), Icons (Font Awesome 6 via CDN).

**5. Project Structure** — a fenced code block showing the directory tree as it currently exists in the repository. Match it exactly to the actual file structure.

**6. Prerequisites** — Node.js 18 or later, a MongoDB instance (local or Atlas), npm.

**7. Installation** — three-command sequence: clone, cd, npm install.

**8. Environment Variables** — copy `.env.example` to `.env`. Markdown table: Variable, Description. Include all seven variables from `.env.example`.

**9. Running Locally** — `npm run dev` starts both servers concurrently. Vite proxies `/api/*` to Express on port 3001. Open `http://localhost:5173`.

**10. Deployment** — Vercel free tier. Push to GitHub, import in Vercel, configure environment variables in the dashboard, deploy. Describe how `vercel.json` routes requests.

**11. Question Import Formats** — document all three formats (TXT, JSON, CSV) with the exact format examples shown in the `FormatExample` components in `AdminDashboard.jsx`. Copy the format examples verbatim. Include the parsing rules for each format.

**12. API Reference** — a Markdown table: Method, Endpoint, Auth, Description. Include every route registered in `api/index.js`. Do not omit any route.

**13. Known Limitations** — plain prose: student identity is stored in localStorage and tied to a display name with no authentication. Name changes retroactively update submission records but name-based impersonation is theoretically possible. This is intentional to minimize friction. Detailed submission answers are stored only for live exam attempts, not practice mode.

**14. License** — MIT, with reference to the LICENSE file.

---

## SECTION 8 — PRIORITY ORDER FOR AGENT

Apply all changes in this exact order:

1. **SECURITY CRITICAL** — Section 2.1 (rate limiting on admin login)
2. **SECURITY HIGH** — Section 3.5 (block unpublished exam access), Section 2.2 (XSS sanitization with DOMPurify)
3. **BUG** — Section 1.2 (remove duplicate PUT route in api/index.js)
4. **PERFORMANCE** — Section 1.1 (sessionStorage stale-while-revalidate cache), Section 1.3 (N+1 leaderboard query fix)
5. **BUG** — Section 3.4 (add missing visibilitychange anti-cheat), Section 3.8 (double submission guard)
6. **PERFORMANCE** — Section 1.4 (add MongoDB indexes), Section 1.5 (HTTP cache headers)
7. **DESIGN** — Section 5 (apply Aurora Slate / Midnight Indigo palette to src/index.css)
8. **ANIMATIONS** — Section 4, applied in sub-order: 4.8 (skeletons) first, then 4.7 (modals), then 4.2 (page enter), then 4.3 (card stagger), then 4.1 (bottom nav pill), then 4.4 (score count-up), then 4.5 (answer pulse), then 4.6 (timer danger), then 4.9 (rank pop)
9. **REFACTOR** — Section 3.1 (ThemeContext), Section 3.2 (BottomNav reactivity + student_name_changed event)
10. **BUG** — Section 3.3 (timer unmount cleanup), Section 3.6 (best score on profile)
11. **UX** — Section 2.6 (server-side question validation), Fix 6.3 (scroll to top), Fix 6.4 (admin question delete modal)
12. **POLISH** — Fix 6.1 (robots.txt and sitemap.xml), Fix 6.2 (textarea autocomplete), Section 3.7 (admin confirm modal)
13. **ENVIRONMENT GUARD** — Section 2.3 (JWT undefined guard), Section 2.4 (CORS origin restriction)
14. **DOCUMENTATION** — Section 7 (rewrite README.md)

---

## NOTES FOR AGENT

- All frontend files are in `src/`. All backend files are in `api/index.js` and `lib/`.
- The app uses Tailwind CSS via CDN (not compiled). All Tailwind classes must use the `theme-*` prefixed tokens defined in `index.html`'s inline Tailwind config, which map to CSS custom properties. Never hardcode hex values in JSX className strings.
- Do NOT upgrade React, React Router, Vite, Express, or Mongoose. Dependency version changes are out of scope.
- Do NOT add student authentication. The localStorage-based identity is an intentional product decision.
- Do NOT add a database seeding script or migration runner. Index creation via Mongoose model definitions is sufficient.
- When applying the color palette (Section 5), touch only the `:root` and `.dark` blocks in `src/index.css`. No other file changes for the palette.
- When applying animations (Section 4), add all keyframes and utility classes to `src/index.css` in the order they appear in this document, then make surgical JSX edits to the listed component files. The `prefers-reduced-motion` media query must always be the absolute last rule in `src/index.css`.
- All file edits must preserve existing code structure. Do not rewrite entire component files. Make the smallest possible change that achieves the described fix.
- After applying the leaderboard N+1 fix (Section 1.3), verify the response shape remains `[{ exam: {...}, submissions: [...] }]` — the frontend `Leaderboard.jsx` depends on this exact structure.
- After applying Animation 4.1, verify the pill initializes on the correct tab immediately on mount, not just on navigation. Run a `useEffect` on mount with an empty dependency check to ensure the pill is positioned even before the user navigates.
- When rewriting the README (Section 7), the file must contain zero emoji characters. Use plain dashes for list items if needed.
