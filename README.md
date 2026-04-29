# ExamPortal

A secure digital examination platform with real-time live exam scheduling, anti-cheat monitoring, and a full-featured admin dashboard. Built with React, Express, MongoDB, and Tailwind CSS. Designed for single-repo deployment on Vercel.

---

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
- [License](#license)

---

## Features

### Student-Facing

- **Live Exams** -- Take scheduled exams within a defined time window. Each live exam can only be attempted once per user.
- **Past Exams** -- Practice with expired exams at any time, with unlimited attempts.
- **Anti-Cheat System** -- Tab switching triggers automatic exam submission. Right-click, copy/paste, and print shortcuts are blocked. Fullscreen mode is requested on exam start.
- **Answer Lock** -- Once a student selects an answer, it cannot be changed.
- **Timer** -- Countdown timer with visual pulse warning when under 60 seconds. Auto-submits when time expires.
- **Score Review** -- Detailed answer review with correct answers and explanations (when provided by the admin).
- **Persistent Identity** -- Student name is saved in localStorage and reused across all exams.

### Admin Dashboard

- **Secure Login** -- Username and password authentication via environment variables, protected by JWT.
- **Exam Management** -- Create, view, and delete exams. Set title, duration, and live time window for each exam.
- **Question Import** -- Add questions via three formats:
  - TXT (custom structured text)
  - JSON (array of question objects)
  - CSV (file upload)
- **Format Examples** -- Copyable format examples displayed beneath each import option for reference.
- **Per-Question Deletion** -- Remove individual questions from any exam through the admin view page.
- **Flexible Options** -- Each question supports 2 to 5 answer options.
- **Explanation Field** -- Optional explanation for each question, displayed in post-exam review.

### Theming

- **Dark/Light Mode** -- Toggle between dark (Midnight Slate/Soft Indigo) and light (Off-White Slate/Vibrant Indigo) themes. Preference is persisted in localStorage. Dark mode is the default.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 19, React Router 6, Vite     |
| Styling   | Tailwind CSS (CDN), CSS Variables   |
| Backend   | Express 4 (Vercel Serverless)       |
| Database  | MongoDB via Mongoose 8              |
| Auth      | JSON Web Tokens (jsonwebtoken)      |
| Icons     | Font Awesome 6                      |

---

## Project Structure

```
EXAM PORTAL/
  api/
    index.js             Express app (Vercel serverless function)
  lib/
    db.js                MongoDB connection helper
    models/
      Exam.js            Mongoose schema for exams and questions
  src/
    App.jsx              Route definitions
    main.jsx             React entry point with BrowserRouter
    index.css            Theme variables, scrollbar, animations
    utils/
      parseQuestions.js   TXT, JSON, CSV parsers
    pages/
      HomePage.jsx       Live, past, and upcoming exam sections
      ExamPage.jsx       Exam-taking interface with anti-cheat
      AdminLogin.jsx     Admin authentication form
      AdminDashboard.jsx Exam management and question import
      AdminExamView.jsx  View and delete individual questions
  public/
    exam-portal.png      Application logo and favicon
  server.js              Local dev server entry point
  vite.config.js         Vite config with API proxy
  vercel.json            Vercel deployment configuration
  .env.example           Environment variable template
  LICENSE                MIT License
```

---

## Prerequisites

- Node.js 18 or later
- A MongoDB instance (local or MongoDB Atlas)
- npm or yarn

---

## Installation

```bash
git clone <repository-url>
cd exam-portal
npm install
```

---

## Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable         | Description                             |
|------------------|-----------------------------------------|
| `MONGO_URI`      | MongoDB connection string               |
| `ADMIN_USERNAME` | Admin login username                    |
| `ADMIN_PASSWORD` | Admin login password                    |
| `JWT_SECRET`     | Secret key for signing JWT tokens       |
| `PORT`           | Backend port for local dev (default: 3001) |

---

## Running Locally

```bash
npm run dev
```

This command starts both the Vite development server (port 5173) and the Express API server (port 3001) concurrently. The Vite config proxies all `/api/*` requests to the Express server.

Open `http://localhost:5173` in your browser.

---

## Deployment

This project is configured for single-repo deployment on **Vercel Free Tier**.

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Set the environment variables in the Vercel dashboard (Settings > Environment Variables).
4. Deploy. Both the frontend and backend will run from the same deployment.

The `vercel.json` file routes `/api/*` requests to the Express serverless function and serves the Vite build output for all other routes.

---

## Question Import Formats

### TXT Format

```
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

- Each question block is separated by a blank line.
- The answer line uses `*N(ans)` where N is the 1-indexed option number.
- The explanation line uses `**` followed by the explanation text. Leave empty (`**`) if none.
- Supports 2 to 5 options per question.

### JSON Format

```json
[
  {
    "question": "What is the capital of France?",
    "options": ["Berlin", "London", "Paris", "Madrid"],
    "correct": 2,
    "explanation": "Paris is the capital of France."
  }
]
```

- `correct` is the 0-indexed position of the correct option.
- `explanation` is optional (use empty string if none).

### CSV Format

```
question,option1,option2,option3,option4,option5,correct,explanation
"What is the capital of France?","Berlin","London","Paris","Madrid","",2,"Paris is the capital."
```

- Upload as a `.csv` file.
- Leave unused option columns empty.
- `correct` is 0-indexed.

---

## API Reference

All endpoints are prefixed with `/api`.

| Method | Endpoint                         | Auth     | Description                          |
|--------|----------------------------------|----------|--------------------------------------|
| POST   | `/admin/login`                   | Public   | Authenticate admin, returns JWT      |
| GET    | `/exams`                         | Public   | List all exams (without questions)   |
| GET    | `/exams/:id`                     | Public   | Get single exam with questions       |
| POST   | `/exams`                         | Admin    | Create a new exam                    |
| PUT    | `/exams/:id`                     | Admin    | Update exam details                  |
| DELETE | `/exams/:id`                     | Admin    | Delete an exam                       |
| POST   | `/exams/:id/questions`           | Admin    | Add questions to an exam             |
| DELETE | `/exams/:id/questions/:qIdx`     | Admin    | Delete a specific question by index  |
| POST   | `/exams/:id/submit`              | Public   | Submit answers, returns score        |

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
