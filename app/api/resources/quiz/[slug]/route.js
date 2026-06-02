import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import Resource from '@/lib/models/Resource'
import { publicResourceSlug } from '@/lib/resourceUtils'

export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { slug } = await params
    await connectDB()

    const resource = await findPublishedResourceBySlug(slug)
    if (!resource) return NextResponse.json({ error: 'Resource quiz not found' }, { status: 404 })

    const quizQuestions = normalizeQuizQuestions(resource.quizQuestions)
    if (!quizQuestions.length) return NextResponse.json({ error: 'No quiz is available for this resource' }, { status: 404 })

    return NextResponse.json({
      _id: resource._id.toString(),
      title: `${resource.title} Quiz`,
      resourceTitle: resource.title,
      resourceSlug: publicResourceSlug(resource),
      duration: quizQuestions.length,
      questionCount: quizQuestions.length,
      questions: quizQuestions.map(({ question, options, order }) => ({ question, options, order })),
    })
  } catch (error) {
    logger.error('[GET /api/resources/quiz/[slug]]', { error })
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
