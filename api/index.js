import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { connectDB } from '../lib/db.js';
import Exam from '../lib/models/Exam.js';
import Submission from '../lib/models/Submission.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// ── GET all exams (public, published only) ───────────────────────────────────
app.get('/api/exams', async (req, res) => {
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

// ── GET single exam with questions ───────────────────────────────────────────
app.get('/api/exams/:id', async (req, res) => {
  try {
    await connectDB();
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    res.json(exam);
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

// ── PUT update exam (admin) ──────────────────────────────────────────────────
app.put('/api/exams/:id', auth, async (req, res) => {
  try {
    await connectDB();
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    res.json(exam);
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
    exam.questions.splice(parseInt(req.params.qIdx), 1);
    await exam.save();
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST add questions to exam (admin) ───────────────────────────────────────
app.post('/api/exams/:id/questions', auth, async (req, res) => {
  try {
    await connectDB();
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    exam.questions.push(...req.body.questions);
    await exam.save();
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST submit exam ─────────────────────────────────────────────────────────
app.post('/api/exams/:id/submit', async (req, res) => {
  try {
    await connectDB();
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    const { answers, studentName } = req.body;

    let score = 0;
    let wrong = 0;
    let unanswered = 0;
    exam.questions.forEach((q, idx) => {
      if (answers[idx] === undefined || answers[idx] === null) unanswered++;
      else if (answers[idx] === q.correct) score++;
      else wrong++;
    });

    const now = new Date();
    const wasLive = exam.liveStart && exam.liveEnd &&
      now >= new Date(exam.liveStart) && now <= new Date(exam.liveEnd);

    await Submission.create({
      examId: exam._id,
      studentName: studentName || 'Anonymous',
      score, total: exam.questions.length, wrong, unanswered, wasLive,
    });

    res.json({ score, total: exam.questions.length, wrong, unanswered, questions: exam.questions });
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

// ── GET leaderboard for an exam ──────────────────────────────────────────────
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

// ── GET all leaderboard data (all live exams) ────────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  try {
    await connectDB();
    const exams = await Exam.find({ published: true, liveStart: { $exists: true } }, { questions: 0 }).sort({ liveEnd: -1 });
    const data = [];
    for (const exam of exams) {
      const submissions = await Submission.find({ examId: exam._id, wasLive: true })
        .sort({ score: -1, submittedAt: 1 });
      
      const uniqueSubs = [];
      const seenNames = new Set();
      for (const sub of submissions) {
        if (!seenNames.has(sub.studentName)) {
          seenNames.add(sub.studentName);
          uniqueSubs.push(sub);
        }
      }

      if (uniqueSubs.length > 0) {
        data.push({ exam, submissions: uniqueSubs });
      }
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET submissions for a student ────────────────────────────────────────────
app.get('/api/submissions/:name', async (req, res) => {
  try {
    await connectDB();
    const submissions = await Submission.find({ studentName: req.params.name })
      .populate('examId', 'title')
      .sort({ submittedAt: -1 });

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

export default app;
