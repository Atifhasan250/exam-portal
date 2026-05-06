import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { validate, publishExamSchema } from '@/lib/validation'
import { logAdminAction } from '@/lib/auditLog'
import { logger } from '@/lib/logger'
import Exam from '@/lib/models/Exam'

export async function PUT(request, { params }) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    const { id } = await params
    await connectDB()
    const exam = await Exam.findById(id)
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    // ── Validate input ──────────────────────────────────────────────
    const raw = await request.json()
    const parsed = validate(publishExamSchema, raw)
    if (!parsed.success) return parsed.response

    exam.published = parsed.data.published
    await exam.save()

    logAdminAction(
      request,
      adminCheck.admin,
      parsed.data.published ? 'PUBLISH_EXAM' : 'UNPUBLISH_EXAM',
      exam._id,
      { title: exam.title },
    )

    return NextResponse.json(exam)
  } catch (error) {
    logger.error('[PUT /api/exams/[id]/publish]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
