import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { adminMutationRateLimit } from '@/lib/rateLimit'
import { validate, addQuestionsSchema, MAX_EXAM_QUESTIONS } from '@/lib/validation'
import { logAdminAction } from '@/lib/auditLog'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'
import { invalidateExamCaches } from '@/lib/publicCache'
import Exam from '@/lib/models/Exam'
import Question from '@/lib/models/Question'

export async function POST(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  // ── Validate input ──────────────────────────────────────────────────
  const limited = await adminMutationRateLimit(request, {
    name: 'admin-exam-question-create',
    keyParts: [adminCheck.admin?.username || 'admin'],
  })
  if (limited) return limited

  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('exam id')

    const raw = await request.json()
    const parsed = validate(addQuestionsSchema, raw)
    if (!parsed.success) return parsed.response
    const { questions } = parsed.data

    await connectDB()
    const exam = await Exam.findById(id)
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    const existingCount = await Question.countDocuments({ examId: exam._id })
    if (existingCount + questions.length > MAX_EXAM_QUESTIONS) {
      return NextResponse.json(
        { error: `An exam can have at most ${MAX_EXAM_QUESTIONS} questions.` },
        { status: 400 },
      )
    }

    const newQuestions = questions.map((question, index) => ({
      ...question,
      examId: exam._id,
      order: existingCount + index,
    }))

    await Question.insertMany(newQuestions)
    const allQuestions = await Question.find({ examId: exam._id }).sort({ order: 1 }).lean()

    await logAdminAction(request, adminCheck.admin, 'ADD_QUESTIONS', exam._id, { count: questions.length })
    try {
      await invalidateExamCaches(exam._id.toString())
    } catch (error) {
      logger.error('[POST /api/exams/[id]/questions] cache invalidation failed', { error, examId: exam._id })
    }

    return NextResponse.json({ ...exam.toObject(), questions: allQuestions })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    logger.error('[POST /api/exams/[id]/questions]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
