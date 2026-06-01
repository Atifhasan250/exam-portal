import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { adminMutationRateLimit } from '@/lib/rateLimit'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'
import { logger } from '@/lib/logger'
import { validate, reorderQuestionsSchema } from '@/lib/validation'
import { invalidateExamCaches } from '@/lib/publicCache'
import Question from '@/lib/models/Question'

export async function PUT(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  const limited = await adminMutationRateLimit(request, {
    name: 'admin-exam-question-reorder',
    keyParts: [adminCheck.admin?.username || 'admin'],
  })
  if (limited) return limited

  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('exam id')

    const raw = await request.json()
    const parsed = validate(reorderQuestionsSchema, raw)
    if (!parsed.success) return parsed.response

    const { orderedIds } = parsed.data
    if (new Set(orderedIds).size !== orderedIds.length) {
      return NextResponse.json({ error: 'Duplicate question ids are not allowed' }, { status: 400 })
    }

    await connectDB()

    const ownedCount = await Question.countDocuments({
      _id: { $in: orderedIds },
      examId: id,
    })
    if (ownedCount !== orderedIds.length) {
      return NextResponse.json(
        { error: 'All reordered questions must belong to this exam' },
        { status: 400 },
      )
    }

    await Promise.all(
      orderedIds.map((questionId, index) => (
        Question.updateOne({ _id: questionId, examId: id }, { $set: { order: index } })
      )),
    )
    await invalidateExamCaches(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[PUT /api/admin/exams/[id]/questions/reorder]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
