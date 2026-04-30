# IT Resource Zone

IT Resource Zone is an online examination platform for IT students and professionals. It supports live scheduled exams with a one-attempt-per-window policy, practice mode for expired exams with unlimited attempts, a countdown timer with auto-submit, locked answer selection, post-exam answer review with explanations, real-time leaderboards for live exam results, a student profile with exam history, detailed submission review for live attempts, and a JWT-protected admin dashboard for managing exams, questions, and publication status. The application is deployed on Vercel free tier as a single repository containing a React frontend and an Express serverless backend.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [Question Import Formats](#question-import-formats)
- [API Reference](#api-reference)
- [Known Limitations](#known-limitations)
- [License](#license)

## Features

### Student-Facing

Students can take live scheduled exams with a one-attempt-per-window policy, ensuring fairness during the active exam period. Once an exam expires, it enters practice mode, allowing for unlimited attempts. Exams feature a countdown timer that auto-submits upon completion, and answer selections are locked once chosen to prevent changes. After submission, students receive immediate feedback with post-exam answer reviews, including explanations for correct answers. Live exam results are aggregated into real-time leaderboards. A personalized student profile tracks exam history and provides detailed submission reviews specifically for live attempts.

### Admin Dashboard

Administrators have access to a secure, JWT-protected dashboard to manage the entire platform. Admins can create, edit, and delete exams, as well as toggle publication status to control visibility. The platform supports bulk importing questions via TXT, JSON, or CSV formats, complete with options, correct answers, and optional explanations. The dashboard also includes tools for managing individual questions within exams, such as deleting specific questions from an active or draft exam.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, React Router 6, Vite |
| Styling | Tailwind CSS via CDN, CSS custom properties |
| Backend | Express 4, Vercel serverless |
| Database | MongoDB, Mongoose 8 |
| Authentication | jsonwebtoken |
| Icons | Font Awesome 6 via CDN |

## Project Structure

```
/exam-portal
|   .env.example
|   .eslintrc.cjs
|   index.html
|   package.json
|   server.js
|   vercel.json
|   vite.config.js
|
+---api
|       index.js
|
+---lib
|   |   db.js
|   |
|   \---models
|           Exam.js
|           Question.js
|           Submission.js
|
+---public
|       favicon.png
|       robots.txt
|       sitemap.xml
|
\---src
    |   App.css
    |   App.jsx
    |   index.css
    |   main.jsx
    |
    +---assets
    |       hero.png
    |       react.svg
    |       vite.svg
    |
    +---components
    |       BottomNav.jsx
    |       Navbar.jsx
    |
    +---context
    |       ThemeContext.jsx
    |
    +---pages
    |       AdminDashboard.jsx
    |       AdminExamView.jsx
    |       AdminLogin.jsx
    |       ExamPage.jsx
    |       ExamsPage.jsx
    |       HomePage.jsx
    |       Leaderboard.jsx
    |       ProfilePage.jsx
    |       SubmissionDetails.jsx
    |
    \---utils
            parseQuestions.js
            sanitize.js
```

## Prerequisites

- Node.js 18 or later
- MongoDB instance (local or Atlas)
- npm

## Installation

```bash
git clone <repository-url>
cd exam-portal
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

| Variable | Description |
| --- | --- |
| `MONGO_URI` | The connection string for your MongoDB database. |
| `ADMIN_USERNAME` | Username for accessing the admin dashboard. |
| `ADMIN_PASSWORD` | Password for accessing the admin dashboard. |
| `JWT_SECRET` | Secret key used for signing JSON Web Tokens. |
| `PORT` | The port the backend server runs on locally (default: 3001). |
| `VITE_GOOGLE_SITE_VERIFICATION` | Google Search Console verification tag. |
| `VITE_BING_SITE_VERIFICATION` | Bing Webmaster Tools verification tag. |

## Running Locally

Run the following command to start both the Vite frontend and Express backend servers concurrently:

```bash
npm run dev
```

Vite proxies `/api/*` to the Express backend running on port 3001. Open `http://localhost:5173` to view the application in the browser.

## Deployment

The application is deployed using the Vercel free tier.

1. Push the code to a GitHub repository.
2. Import the project in Vercel.
3. Configure the required environment variables in the Vercel dashboard.
4. Deploy the application.

The `vercel.json` file configures serverless function routing. It directs all requests starting with `/api/(.*)` to the `api/index.js` Express backend, while routing all other requests `/(.*)` to `index.html` to allow React Router to handle client-side routing.

## Question Import Formats

The admin dashboard supports importing questions in three different formats: TXT, JSON, and CSV.

### TXT Format

**Parsing rules**: Questions start with "Q" followed by a number. Options are numbered (1., 2., etc.). The correct answer is indicated by an asterisk and the word "(ans)". Explanations start with a double asterisk.

**Format Example**:
```txt
Q1. What is the capital of France?
1. Berlin
2. London
3. Paris
4. Madrid
*3(ans)
**Paris is the capital and largest city of France.

Q2. Which is a JavaScript framework?
1. Django
2. Flask
3. React
4. Laravel
5. Spring
*3(ans)
**
```

### JSON Format

**Parsing rules**: A valid JSON array of objects. Each object must contain `question` (string), `options` (array of strings), `correct` (0-indexed integer), and an optional `explanation` (string).

**Format Example**:
```json
[
  {
    "question": "What is the capital of France?",
    "options": ["Berlin", "London", "Paris", "Madrid"],
    "correct": 2,
    "explanation": "Paris is the capital of France."
  },
  {
    "question": "Which is a JS framework?",
    "options": ["Django", "Flask", "React"],
    "correct": 2,
    "explanation": ""
  }
]
```

### CSV Format

**Parsing rules**: A CSV file with headers. Required columns are `question`, `option1`, `option2`, `option3` (with up to 5 options), `correct` (1-indexed integer representing the correct column), and `explanation`.

**Format Example**:
```csv
question,option1,option2,option3,option4,option5,correct,explanation
"What is the capital of France?","Berlin","London","Paris","Madrid","",2,"Paris is the capital."
"Which is a JS framework?","Django","Flask","React","","",2,""
```

## API Reference

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/admin/login` | No | Authenticate admin and receive JWT token. |
| `GET` | `/api/exams` | No | Retrieve a list of all published exams. |
| `GET` | `/api/admin/exams` | Admin | Retrieve a list of all exams, including drafts. |
| `PUT` | `/api/exams/:id/publish` | Admin | Toggle the published status of an exam. |
| `GET` | `/api/exams/:id` | No | Retrieve a specific published exam with its questions. |
| `POST` | `/api/exams` | Admin | Create a new exam. |
| `PUT` | `/api/exams/:id` | Admin | Update details of a specific exam (title, dates, duration). |
| `DELETE` | `/api/exams/:id` | Admin | Delete an exam and its associated questions and submissions. |
| `DELETE` | `/api/exams/:id/questions/:qIdx` | Admin | Delete a specific question from an exam. |
| `POST` | `/api/exams/:id/questions` | Admin | Bulk import questions into a specific exam. |
| `POST` | `/api/exams/:id/submit` | No | Submit an exam attempt and receive immediate results. |
| `PUT` | `/api/submissions/name` | No | Update a student's display name across all previous submissions. |
| `GET` | `/api/exams/:id/leaderboard` | No | Retrieve leaderboard data for a specific live exam. |
| `GET` | `/api/leaderboard` | No | Retrieve aggregated leaderboard data for all live exams. |
| `GET` | `/api/submissions/:name` | No | Retrieve the best-score submissions for a specific student name. |
| `GET` | `/api/submissions/details/:id` | No | Retrieve detailed review data for a specific submission. |

## Known Limitations

Student identity is stored in localStorage and tied to a display name with no authentication. Name changes retroactively update submission records but name-based impersonation is theoretically possible. This is intentional to minimize friction. Detailed submission answers are stored only for live exam attempts, not practice mode.

## License

This project is open-source and available under the MIT License. Please see the LICENSE file for more information.
