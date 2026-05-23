import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { validate, createExamSchema } from '@/lib/validation'
import { logAdminAction } from '@/lib/auditLog'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { getCachedPublishedExams, invalidateExamCaches } from '@/lib/publicCache'
import Exam from '@/lib/models/Exam'

export const revalidate = 30

export async function GET() {
  try {
    const exams = await getCachedPublishedExams()

    return NextResponse.json(exams, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
    })
  } catch (error) {
    logger.error('[GET /api/exams]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

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

    await logAdminAction(request, adminCheck.admin, 'CREATE_EXAM', exam._id, { title: exam.title })
    await invalidateExamCaches(exam._id.toString())

    return NextResponse.json(exam, { status: 201 })
  } catch (error) {
    logger.error('[POST /api/exams]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
