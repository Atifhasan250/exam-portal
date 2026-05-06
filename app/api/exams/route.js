import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { validate, createExamSchema } from '@/lib/validation'
import { logAdminAction } from '@/lib/auditLog'
import { logger } from '@/lib/logger'
import Exam from '@/lib/models/Exam'

export async function GET() {
  try {
    await connectDB()
    const exams = await Exam.find({ published: true }, { questions: 0 }).sort({ createdAt: -1 })
    return NextResponse.json(exams, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    })
  } catch (error) {
    logger.error('[GET /api/exams]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    await connectDB()

    // ── Validate input ──────────────────────────────────────────────
    const raw = await request.json()
    const parsed = validate(createExamSchema, raw)
    if (!parsed.success) return parsed.response

    const exam = new Exam(parsed.data)
    await exam.save()

    logAdminAction(request, adminCheck.admin, 'CREATE_EXAM', exam._id, { title: exam.title })

    return NextResponse.json(exam, { status: 201 })
  } catch (error) {
    logger.error('[POST /api/exams]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
