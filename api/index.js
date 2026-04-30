import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { connectDB } from '../lib/db.js';
import Exam from '../lib/models/Exam.js';
import Submission from '../lib/models/Submission.js';
import Question from '../lib/models/Question.js';

// ── Environment Guard ────────────────────────────────────────────────────────
const REQUIRED_ENV = ['MONGO_URI', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'JWT_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: Missing environment variable: ${key}`);
    process.exit(1);
  }
}

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://it-resource-zone.vercel.app']
    : ['http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json({ limit: '10mb' }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many requests.' }
});
app.use('/api/', apiLimiter);

// ── Auth Middleware ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ── Admin Login ──────────────────────────────────────────────────────────────
app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// ── GET all exams (public, published only) ───────────────────────────────────
app.get('/api/exams', async (req, res) => {
  res.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
  try {
    await connectDB();
    const exams = await Exam.find({ published: true }, { questions: 0 }).sort({ createdAt: -1 });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET all exams (admin, includes unpublished) ──────────────────────────────
app.get('/api/admin/exams', auth, async (req, res) => {
  try {
    await connectDB();
    const exams = await Exam.find({}, { questions: 0 }).sort({ createdAt: -1 });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT toggle exam publish status (admin) ───────────────────────────────────
app.put('/api/exams/:id/publish', auth, async (req, res) => {
  try {
    await connectDB();
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    exam.published = req.body.published;
    await exam.save();
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single exam with questions (published only) ───────────────────────────
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

// ── POST create exam (admin) ─────────────────────────────────────────────────
app.post('/api/exams', auth, async (req, res) => {
  try {
    await connectDB();
    const exam = new Exam(req.body);
    await exam.save();
    res.status(201).json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT update exam details (admin) ──────────────────────────────────────────
app.put('/api/exams/:id', auth, async (req, res) => {
  try {
    await connectDB();
    const { title, duration, liveStart, liveEnd } = req.body;
    const exam = await Exam.findByIdAndUpdate(req.params.id, {
      $set: { title, duration, liveStart, liveEnd }
    }, { new: true });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE exam (admin) ──────────────────────────────────────────────────────
app.delete('/api/exams/:id', auth, async (req, res) => {
  try {
    await connectDB();
    await Exam.findByIdAndDelete(req.params.id);
    await Question.deleteMany({ examId: req.params.id });
    await Submission.deleteMany({ examId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE question from exam (admin) ────────────────────────────────────────
app.delete('/api/exams/:id/questions/:qIdx', auth, async (req, res) => {
  try {
    await connectDB();
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    const questions = await Question.find({ examId: exam._id }).sort({ order: 1 });
    const qIdx = parseInt(req.params.qIdx);

    if (questions[qIdx]) {
      await Question.findByIdAndDelete(questions[qIdx]._id);
    }

    const remaining = await Question.find({ examId: exam._id }).sort({ order: 1 }).lean();
    res.json({ ...exam.toObject(), questions: remaining });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST add questions to exam (admin) ───────────────────────────────────────
app.post('/api/exams/:id/questions', auth, async (req, res) => {
  const questions = req.body.questions;
  if (!Array.isArray(questions) || questions.length === 0)
    return res.status(400).json({ error: 'questions must be a non-empty array' });

  for (const [i, q] of questions.entries()) {
    if (!q.question || typeof q.question !== 'string')
      return res.status(400).json({ error: `Question ${i + 1}: missing question text` });
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 5)
      return res.status(400).json({ error: `Question ${i + 1}: must have 2-5 options` });
    if (typeof q.correct !== 'number' || q.correct < 0 || q.correct >= q.options.length)
      return res.status(400).json({ error: `Question ${i + 1}: invalid correct index` });
  }

  try {
    await connectDB();
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    const existingCount = await Question.countDocuments({ examId: exam._id });

    const newQuestions = questions.map((q, idx) => ({
      ...q,
      examId: exam._id,
      order: existingCount + idx
    }));

    await Question.insertMany(newQuestions);

    const allQuestions = await Question.find({ examId: exam._id }).sort({ order: 1 }).lean();
    res.json({ ...exam.toObject(), questions: allQuestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST submit exam ─────────────────────────────────────────────────────────
app.post('/api/exams/:id/submit', async (req, res) => {
  try {
    await connectDB();
    const exam = await Exam.findById(req.params.id).lean();
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    const questions = await Question.find({ examId: exam._id }).sort({ order: 1 }).lean();
    const { answers, studentName } = req.body;

    let score = 0;
    let wrong = 0;
    let unanswered = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === undefined || answers[idx] === null) unanswered++;
      else if (answers[idx] === q.correct) score++;
      else wrong++;
    });

    const now = new Date();
    const wasLive = exam.liveStart && exam.liveEnd &&
      now >= new Date(exam.liveStart) && now <= new Date(exam.liveEnd);

    const sName = studentName || 'Anonymous';
    const existingSubmission = await Submission.findOne({
      examId: exam._id,
      studentName: sName
    });

    if (!existingSubmission) {
      const submissionData = {
        examId: exam._id,
        studentName: sName,
        score, total: questions.length, wrong, unanswered, wasLive,
        answers
      };
      await Submission.create(submissionData);
    }

    res.json({ score, total: questions.length, wrong, unanswered, questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT update student name ──────────────────────────────────────────────────
app.put('/api/submissions/name', async (req, res) => {
  try {
    await connectDB();
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ error: 'Missing names' });
    await Submission.updateMany({ studentName: oldName }, { $set: { studentName: newName } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET leaderboard for a single exam ────────────────────────────────────────
app.get('/api/exams/:id/leaderboard', async (req, res) => {
  try {
    await connectDB();
    const submissions = await Submission.find({ examId: req.params.id, wasLive: true })
      .sort({ score: -1, submittedAt: 1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET all leaderboard data (batched, no N+1) ───────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  try {
    await connectDB();
    const exams = await Exam.find(
      { published: true, liveStart: { $exists: true } },
      { questions: 0 }
    ).sort({ liveEnd: -1 }).lean();

    const examIds = exams.map(e => e._id);

    const submissions = await Submission.find({ examId: { $in: examIds }, wasLive: true })
      .sort({ score: -1, submittedAt: 1 })
      .lean();

    // Group by examId, deduplicate by studentName (keeping best score first)
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

// ── GET submissions for a student (best score per exam) ───────────────────────
app.get('/api/submissions/:name', async (req, res) => {
  try {
    await connectDB();
    const submissions = await Submission.find({ studentName: req.params.name })
      .populate('examId', 'title')
      .sort({ score: -1, submittedAt: -1 });

    const uniqueSubmissions = [];
    const seenExams = new Set();
    for (const sub of submissions) {
      const examIdStr = sub.examId?._id?.toString();
      if (examIdStr && !seenExams.has(examIdStr)) {
        seenExams.add(examIdStr);
        uniqueSubmissions.push(sub);
      }
    }

    res.json(uniqueSubmissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET submission details (includes answers and questions) ──────────────────
app.get('/api/submissions/details/:id', async (req, res) => {
  try {
    await connectDB();
    const submission = await Submission.findById(req.params.id).populate('examId', 'title duration');
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const questions = await Question.find({ examId: submission.examId._id }).sort({ order: 1 }).lean();
    res.json({ submission, questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
