import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getClerkSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { validate, submitExamSchema } from '@/lib/validation'
import Resource from '@/lib/models/Resource'

export const dynamic = 'force-dynamic'

export async function POST(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  try {
    const { slug } = await params
    const { userId } = await getClerkSession()
    if (!userId) {
      return NextResponse.json({ error: 'Please sign in before taking a quiz.' }, { status: 401 })
    }

    const limited = await rateLimit(request, {
      name: 'resource-quiz-submit',
      windowMs: 60 * 1000,
      max: 20,
      keyParts: [userId, slug],
      message: 'Too many quiz submissions for this resource.',
    })
    if (limited) return limited

    const raw = await request.json()
    const parsed = validate(submitExamSchema, raw)
    if (!parsed.success) return parsed.response

    await connectDB()
    const resource = await findPublishedResourceBySlug(slug)
    if (!resource) return NextResponse.json({ error: 'Resource quiz not found' }, { status: 404 })

    const questions = normalizeQuizQuestions(resource.quizQuestions)
    if (!questions.length) return NextResponse.json({ error: 'No quiz is available for this resource' }, { status: 404 })

    const { answers } = parsed.data
    const invalidAnswer = Object.entries(answers).some(([key, value]) => {
      if (!/^\d+$/.test(key)) return true
      const index = Number(key)
      return index < 0 || index >= questions.length || value >= questions[index].options.length
    })

    if (invalidAnswer) return NextResponse.json({ error: 'Invalid answers submitted' }, { status: 400 })

    let score = 0
    let wrong = 0
    let unanswered = 0
    questions.forEach((question, index) => {
      if (answers[index] === undefined || answers[index] === null) unanswered += 1
      else if (answers[index] === question.correct) score += 1
      else wrong += 1
    })

    return NextResponse.json({
      score,
      total: questions.length,
      wrong,
      unanswered,
      reviewAvailable: true,
      questions,
    })
  } catch (error) {
    logger.error('[POST /api/resources/quiz/[slug]/submit]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

async function findPublishedResourceBySlug(slug) {
  const bySlug = await Resource.findOne({ published: true, slug }).lean()
  if (bySlug) return bySlug

  const idCandidate = String(slug || '').split('-').at(-1)
  if (!/^[0-9a-fA-F]{24}$/.test(idCandidate)) return null

  return Resource.findOne({ published: true, _id: idCandidate }).lean()
}

function normalizeQuizQuestions(questions = []) {
  if (!Array.isArray(questions)) return []

  return questions
    .map((question, index) => ({
      question: question.question,
      options: Array.isArray(question.options) ? question.options : [],
      correct: Number(question.correct),
      explanation: question.explanation || '',
      order: Number.isFinite(Number(question.order)) ? Number(question.order) : index + 1,
    }))
    .filter((question) => question.question && question.options.length >= 2 && question.correct >= 0 && question.correct < question.options.length)
    .sort((a, b) => a.order - b.order)
}
