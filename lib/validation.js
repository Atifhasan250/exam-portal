import { z } from 'zod'

// ── Exam Submission ──────────────────────────────────────────────────
export const submitExamSchema = z.object({
  answers: z
    .record(z.string(), z.number().int().min(0).max(4))
    .refine(
      (answers) => Object.keys(answers).length <= 200,
      { message: 'Too many answers submitted' },
    )
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
    .min(1, 'Question text is required')
    .max(5000, 'Question text must be 5000 characters or fewer')
    .refine(hasOnlyAllowedQuestionHtml, 'Question contains unsupported HTML'),
  options: z
    .array(
      z.string()
        .trim()
        .min(1)
        .max(1000, 'Option text must be 1000 characters or fewer')
        .refine(hasOnlyAllowedQuestionHtml, 'Option contains unsupported HTML'),
    )
    .min(2, 'Must have at least 2 options')
    .max(5, 'Must have at most 5 options'),
  correct: z
    .number()
    .int()
    .min(0),
  explanation: z
    .string()
    .trim()
    .max(5000, 'Explanation must be 5000 characters or fewer')
    .refine(hasOnlyAllowedQuestionHtml, 'Explanation contains unsupported HTML')
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

export const reorderQuestionsSchema = z.object({
  orderedIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid question id'))
    .min(1, 'At least one question id is required')
    .max(300, 'Too many questions to reorder'),
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

const ALLOWED_QUESTION_TAGS = new Set(['b', 'i', 'em', 'strong', 'code', 'br', 'sub', 'sup'])

function hasOnlyAllowedQuestionHtml(value) {
  const tags = value.match(/<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g) || []

  return tags.every((tag) => {
    const match = tag.match(/^<\/?([a-zA-Z][a-zA-Z0-9-]*)\b/)
    if (!match) return false
    if (!ALLOWED_QUESTION_TAGS.has(match[1].toLowerCase())) return false
    return !/\s[a-zA-Z-]+\s*=/.test(tag)
  })
}

function safeResourceUrl(value) {
  if (!value) return true

  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const habitHistorySchema = z
  .record(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.record(z.string().max(80), z.boolean()),
  )
  .default({})

const plannerTaskSchema = z.object({
  id: z.string().trim().min(1).max(80),
  days: z.string().trim().min(1).max(50),
  desc: z.string().trim().min(1).max(500),
  resource: z
    .string()
    .trim()
    .max(500)
    .refine(safeResourceUrl, 'Resource must be a valid http or https URL')
    .optional(),
  completed: z.boolean().default(false),
  completedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const plannerDataSchema = z.object({
  habits: z
    .array(z.object({
      id: z.string().trim().min(1).max(80),
      label: z.string().trim().min(1).max(120),
    }))
    .max(30)
    .optional(),
  habitHistory: habitHistorySchema.optional(),
  weeks: z
    .array(z.object({
      week: z.number().int().min(1).max(52),
      title: z.string().trim().min(1).max(120),
      tasks: z.array(plannerTaskSchema).max(50),
    }))
    .max(52)
    .optional(),
  tagDismissed: z.boolean().optional(),
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
