import { z } from 'zod'

// ── Exam Submission ──────────────────────────────────────────────────
export const submitExamSchema = z.object({
  answers: z
    .record(z.string(), z.number().int().min(0))
    .default({}),
  studentName: z
    .string()
    .trim()
    .min(1, 'Student name is required')
    .max(100, 'Student name must be 100 characters or fewer'),
})

// ── Create Exam (Admin) ─────────────────────────────────────────────
export const createExamSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Exam title is required')
    .max(200, 'Exam title must be 200 characters or fewer'),
  duration: z
    .number()
    .int()
    .min(1, 'Duration must be at least 1 minute')
    .max(600, 'Duration must be 600 minutes or fewer'),
  liveStart: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable(),
  liveEnd: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable(),
})

// ── Update Exam (Admin) ─────────────────────────────────────────────
export const updateExamSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional(),
  duration: z
    .number()
    .int()
    .min(1)
    .max(600)
    .optional(),
  liveStart: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable(),
  liveEnd: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable(),
})

// ── Add Questions (Admin) ───────────────────────────────────────────
const questionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Question text is required'),
  options: z
    .array(z.string().trim().min(1))
    .min(2, 'Must have at least 2 options')
    .max(5, 'Must have at most 5 options'),
  correct: z
    .number()
    .int()
    .min(0),
  explanation: z
    .string()
    .trim()
    .default(''),
})
  .refine(
    (data) => data.correct < data.options.length,
    { message: 'Correct index must be within options range', path: ['correct'] },
  )

export const addQuestionsSchema = z.object({
  questions: z
    .array(questionSchema)
    .min(1, 'At least 1 question is required'),
})

// ── Publish/Unpublish Exam (Admin) ──────────────────────────────────
export const publishExamSchema = z.object({
  published: z.boolean(),
})

// ── Admin Login ─────────────────────────────────────────────────────
export const adminLoginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Username is required'),
  password: z
    .string()
    .min(1, 'Password is required'),
})

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Validates data against a Zod schema.
 * Returns { success: true, data } or { success: false, response } with a 400 JSON error.
 */
export function validate(schema, data) {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))

  return {
    success: false,
    response: Response.json(
      { error: 'Validation failed', details: errors },
      { status: 400 },
    ),
  }
}
