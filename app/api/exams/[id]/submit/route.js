import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { clerkClient } from '@clerk/nextjs/server'
import { connectDB } from '@/lib/db'
import { getClerkSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { validate, submitExamSchema } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'
import { invalidateLeaderboardCaches } from '@/lib/publicCache'
import { getPostHogClient } from '@/lib/posthog-server'
import Exam from '@/lib/models/Exam'
import Question from '@/lib/models/Question'
import Submission from '@/lib/models/Submission'
import ExamAttempt from '@/lib/models/ExamAttempt'
import PracticeAttempt from '@/lib/models/PracticeAttempt'

async function getTrustedStudentName(userId) {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const displayName =
      user.fullName ||
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.username ||
      user.emailAddresses?.[0]?.emailAddress?.split('@')[0] ||
      'Student'

    return displayName.trim().slice(0, 100) || 'Student'
  } catch {
    return 'Student'
  }
}

function normalizeAttemptAnswers(answers) {
  if (!answers) return {}
  if (answers instanceof Map) return Object.fromEntries(answers.entries())
  return Object.fromEntries(
    Object.entries(answers).map(([key, value]) => [key, Number(value)]),
  )
}

export async function POST(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const limited = await rateLimit(request, {
    name: 'exam-submit',
    windowMs: 60 * 1000,
    max: 30,
    message: 'Too many submission attempts.',
    requirePersistent: true,
  })
  if (limited) return limited

  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('exam id')

    await connectDB()
    const exam = await Exam.findById(id).lean()
    if (!exam || !exam.published) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    const { userId } = await getClerkSession()
    if (!userId) {
      return NextResponse.json({ error: 'Please sign in before taking an exam.' }, { status: 401 })
    }

    const now = new Date()
    const liveStart = exam.liveStart ? new Date(exam.liveStart) : null
    const liveEnd = exam.liveEnd ? new Date(exam.liveEnd) : null
    if (liveStart && now < liveStart) {
      return NextResponse.json({ error: 'This exam has not started yet.' }, { status: 403 })
    }

    const raw = await request.json()
    const parsed = validate(submitExamSchema, raw)
    if (!parsed.success) return parsed.response

    const liveSubmitGraceEnd = liveEnd ? new Date(liveEnd.getTime() + 30 * 1000) : null
    const liveSubmissionWindow = Boolean(
      liveStart &&
      liveEnd &&
      now >= liveStart &&
      now <= liveSubmitGraceEnd,
    )
    const studentName = await getTrustedStudentName(userId)
    let { answers } = parsed.data
    let questions = []
    let attempt = null
    let wasLive = false
    let savedSubmissionId = null

    if (liveSubmissionWindow) {
      if (!parsed.data.attemptId) {
        return NextResponse.json(
          { error: 'A server attempt is required for live exam submission.' },
          { status: 400 },
        )
      }

      attempt = await ExamAttempt.findOne({
        _id: parsed.data.attemptId,
        examId: exam._id,
        clerkUserId: userId,
        status: 'in_progress',
      })

      if (!attempt) {
        return NextResponse.json({ error: 'Active attempt not found.' }, { status: 404 })
      }

      const attemptGraceEnd = new Date(attempt.expiresAt.getTime() + 30 * 1000)
      if (attemptGraceEnd < now) {
        await ExamAttempt.updateOne(
          { _id: attempt._id, status: 'in_progress' },
          { $set: { status: 'expired' } },
        )
        return NextResponse.json({ error: 'This attempt has expired.' }, { status: 403 })
      }

      answers = normalizeAttemptAnswers(attempt.answers)
      const questionDocs = await Question.find({ _id: { $in: attempt.questionIds }, examId: exam._id }).lean()
      const questionMap = new Map(questionDocs.map((question) => [question._id.toString(), question]))
      questions = attempt.questionIds
        .map((questionId) => questionMap.get(questionId.toString()))
        .filter(Boolean)
      wasLive = true
    } else {
      const practiceLimited = await rateLimit(request, {
        name: 'practice-submit',
        windowMs: 60 * 1000,
        max: 10,
        keyParts: [userId, id],
        message: 'Too many practice submissions for this exam.',
      })
      if (practiceLimited) return practiceLimited

      questions = await Question.find({ examId: exam._id }).sort({ order: 1 }).lean()
    }

    const invalidAnswer = Object.entries(answers).some(([key, value]) => {
      if (!/^\d+$/.test(key)) return true
      const index = Number(key)
      return index < 0 || index >= questions.length || value >= questions[index].options.length
    })

    if (invalidAnswer) {
      return NextResponse.json({ error: 'Invalid answers submitted' }, { status: 400 })
    }

    let score = 0
    let wrong = 0
    let unanswered = 0
    questions.forEach((question, index) => {
      if (answers[index] === undefined || answers[index] === null) unanswered += 1
      else if (answers[index] === question.correct) score += 1
      else wrong += 1
    })

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        if (wasLive) {
          const existingSubmission = await Submission.findOne({
            examId: exam._id,
            clerkUserId: userId,
            wasLive: true,
          }).session(session)

          if (existingSubmission) throw new Error('DUPLICATE_SUBMISSION')
          const createdSubmissions = await Submission.create(
            [
              {
                examId: exam._id,
                clerkUserId: userId,
                studentName,
                score,
                total: questions.length,
                wrong,
                unanswered,
                wasLive,
                answers,
                attemptCount: 1,
                lastAttemptAt: new Date(),
              },
            ],
            { session },
          )
          savedSubmissionId = createdSubmissions[0]?._id?.toString() || null
        } else {
          const submittedAt = new Date()
          const existingPracticeSubmissions = await Submission.find({
            examId: exam._id,
            clerkUserId: userId,
            wasLive: false,
          })
            .sort({ score: -1, submittedAt: -1 })
            .session(session)

          const submittedPracticeAttemptCount = existingPracticeSubmissions.reduce(
            (totalAttempts, submission) => totalAttempts + (submission.attemptCount || 1),
            0,
          )
          const recordedPracticeStartCount = await PracticeAttempt.countDocuments({
            examId: exam._id,
            clerkUserId: userId,
          }).session(session)
          const attemptCount = recordedPracticeStartCount > 0
            ? Math.max(recordedPracticeStartCount, submittedPracticeAttemptCount)
            : submittedPracticeAttemptCount + 1

          const practicePayload = {
            examId: exam._id,
            clerkUserId: userId,
            studentName,
            score,
            total: questions.length,
            wrong,
            unanswered,
            wasLive,
            answers,
            attemptCount,
            lastAttemptAt: submittedAt,
          }

          const bestPracticeSubmission = existingPracticeSubmissions[0]
          if (!bestPracticeSubmission) {
            const createdSubmissions = await Submission.create(
              [
                {
                  ...practicePayload,
                  submittedAt,
                },
              ],
              { session },
            )
            savedSubmissionId = createdSubmissions[0]?._id?.toString() || null
          } else {
            const currentIsBetter =
              score > bestPracticeSubmission.score ||
              (score === bestPracticeSubmission.score && wrong < bestPracticeSubmission.wrong) ||
              (
                score === bestPracticeSubmission.score &&
                wrong === bestPracticeSubmission.wrong &&
                unanswered < bestPracticeSubmission.unanswered
              )

            await Submission.updateOne(
              { _id: bestPracticeSubmission._id },
              currentIsBetter
                ? {
                    $set: {
                      ...practicePayload,
                      submittedAt,
                    },
                  }
                : {
                    $set: {
                      attemptCount,
                      lastAttemptAt: submittedAt,
                    },
                  },
              { session },
            )
            savedSubmissionId = bestPracticeSubmission._id.toString()

            const duplicatePracticeIds = existingPracticeSubmissions
              .slice(1)
              .map((submission) => submission._id)
            if (duplicatePracticeIds.length > 0) {
              await Submission.deleteMany({ _id: { $in: duplicatePracticeIds } }).session(session)
            }
          }
        }

        if (attempt) {
          await ExamAttempt.updateOne(
            { _id: attempt._id, status: 'in_progress' },
            {
              $set: {
                status: 'submitted',
                submittedAt: new Date(),
              },
            },
            { session },
          )
        }
      })

      await invalidateLeaderboardCaches(exam._id.toString())

      try {
        const posthog = getPostHogClient()
        posthog.capture({
          distinctId: userId,
          event: 'exam_completed',
          properties: {
            exam_id: id,
            exam_title: exam.title,
            score,
            total: questions.length,
            wrong,
            unanswered,
            was_live: wasLive,
            percentage: questions.length > 0 ? Math.round((score / questions.length) * 100) : 0,
          },
        })
      } catch (analyticsError) {
        logger.error('[POST /api/exams/[id]/submit] PostHog capture failed', { error: analyticsError })
      }

      return NextResponse.json({
        score,
        total: questions.length,
        wrong,
        unanswered,
        submissionId: savedSubmissionId,
        wasLive,
        reviewAvailable: !wasLive,
        reviewAvailableAt: wasLive && liveEnd ? liveEnd.toISOString() : null,
        questions: wasLive ? [] : questions,
      })
    } catch (txError) {
      if (txError.message === 'DUPLICATE_SUBMISSION' || txError.code === 11000) {
        return NextResponse.json(
          { error: 'You have already completed this live exam.' },
          { status: 409 },
        )
      }
      throw txError
    } finally {
      await session.endSession()
    }
  } catch (error) {
    logger.error('[POST /api/exams/[id]/submit]', { error })
    return NextResponse.json(
      { error: logger.safeErrorMessage(error) },
      { status: 500 },
    )
  }
}
