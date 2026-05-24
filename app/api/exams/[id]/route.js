import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { validate, updateExamSchema } from '@/lib/validation'
import { logAdminAction } from '@/lib/auditLog'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'
import {
  getCachedPublicExamDetail,
  invalidateExamCaches,
  publicExamWithRuntimeAccess,
} from '@/lib/publicCache'
import Exam from '@/lib/models/Exam'
import Question from '@/lib/models/Question'
import Submission from '@/lib/models/Submission'
import ExamAttempt from '@/lib/models/ExamAttempt'

export async function GET(_request, { params }) {
  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('exam id')

    const exam = publicExamWithRuntimeAccess(await getCachedPublicExamDetail(id))
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    return NextResponse.json(exam)
  } catch (error) {
    logger.error('[GET /api/exams/[id]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('exam id')

    await connectDB()

    // ── Validate input ──────────────────────────────────────────────
    const raw = await request.json()
    const parsed = validate(updateExamSchema, raw)
    if (!parsed.success) return parsed.response

    const set = Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined),
    )
    const exam = await Exam.findByIdAndUpdate(
      id,
      { $set: set },
      { new: true },
    )

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    try {
      await logAdminAction(request, adminCheck.admin, 'UPDATE_EXAM', exam._id, { title: exam.title })
    } catch (error) {
      logger.error('[PUT /api/exams/[id]] audit log failed', { error, examId: exam._id, action: 'UPDATE_EXAM' })
    }
    try {
      await invalidateExamCaches(exam._id.toString())
    } catch (error) {
      logger.error('[PUT /api/exams/[id]] cache invalidation failed', { error, examId: exam._id })
    }

    return NextResponse.json(exam)
  } catch (error) {
    logger.error('[PUT /api/exams/[id]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('exam id')

    await connectDB()

    // ── Transaction: delete exam + questions + submissions atomically ─
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await Exam.findByIdAndDelete(id).session(session)
        await Question.deleteMany({ examId: id }).session(session)
        await Submission.deleteMany({ examId: id }).session(session)
        await ExamAttempt.deleteMany({ examId: id }).session(session)
      })
    } finally {
      await session.endSession()
    }

    try {
      await logAdminAction(request, adminCheck.admin, 'DELETE_EXAM', id)
    } catch (error) {
      logger.error('[DELETE /api/exams/[id]] audit log failed', { error, examId: id, action: 'DELETE_EXAM' })
    }
    try {
      await invalidateExamCaches(id)
    } catch (error) {
      logger.error('[DELETE /api/exams/[id]] cache invalidation failed', { error, examId: id })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[DELETE /api/exams/[id]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
