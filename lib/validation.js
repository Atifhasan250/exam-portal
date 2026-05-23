import { z } from 'zod'

// Exam Submission
export const submitExamSchema = z.object({
  attemptId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid attempt id')
    .optional(),
  answers: z
    .record(z.string(), z.number().int().min(0).max(4))
    .refine(
      (answers) => Object.keys(answers).length <= 200,
      { message: 'Too many answers submitted' },
    )
    .default({}),
})

export const attemptAnswerSchema = z.object({
  questionIndex: z.number().int().min(0).max(300),
  optionIndex: z.number().int().min(0).max(4),
})

export const attemptEventSchema = z.object({
  type: z.enum(['visibility-hidden', 'beforeunload', 'manual-submit', 'timer-expired']),
  occurredAt: z.string().datetime({ offset: true }).optional(),
})

// Create Exam (Admin)
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

// Update Exam (Admin)
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

// Add Questions (Admin)
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

// Publish/Unpublish Exam (Admin)
export const publishExamSchema = z.object({
  published: z.boolean(),
})

export const reorderQuestionsSchema = z.object({
  orderedIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid question id'))
    .min(1, 'At least one question id is required')
    .max(300, 'Too many questions to reorder'),
})

// Admin Login
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
    if (url.protocol === 'https:') return true
    if (url.protocol !== 'http:') return false
    return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
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
    .refine(safeResourceUrl, 'Resource must be a valid HTTPS URL')
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

// Resource Hub
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id')
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain lowercase letters, numbers, and hyphens')

const optionalUrlSchema = z
  .string()
  .trim()
  .max(1200)
  .refine(safeResourceUrl, 'URL must be a valid HTTPS URL')
  .optional()
  .or(z.literal(''))

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'application/octet-stream',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
])

const tagListSchema = z
  .array(z.string().trim().min(1).max(80))
  .max(30)
  .default([])

export const createResourceCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(120),
  slug: slugSchema.optional(),
  description: z.string().trim().max(500).default(''),
  icon: z.string().trim().max(80).default('fa-book-open'),
  color: z.string().trim().max(40).default('#4F46E5'),
  order: z.coerce.number().int().min(0).max(100000).default(0),
  published: z.boolean().default(true),
  featured: z.boolean().default(false),
})

export const updateResourceCategorySchema = createResourceCategorySchema.partial()

const resourceBaseSchema = z.object({
  categoryId: objectIdSchema,
  type: z.enum(['youtube', 'pdf', 'link', 'image', 'file']),
  title: z.string().trim().min(1, 'Title is required').max(220),
  slug: z.string().trim().toLowerCase().max(280).optional().or(z.literal('')),
  description: z.string().trim().max(2000).default(''),
  url: optionalUrlSchema,
  thumbnailUrl: optionalUrlSchema,
  youtubeId: z.string().trim().max(40).optional().or(z.literal('')),
  youtubePlaylistId: z.string().trim().max(80).optional().or(z.literal('')),
  channelTitle: z.string().trim().max(180).default(''),
  durationSeconds: z.coerce.number().int().min(0).max(604800).default(0),
  sourcePublishedAt: z.string().datetime({ offset: true }).optional().nullable(),
  assetId: objectIdSchema.optional().or(z.literal('')),
  imagekitFileId: z.string().trim().max(180).optional().or(z.literal('')),
  imagekitUrl: optionalUrlSchema,
  fileName: z.string().trim().max(260).default(''),
  mimeType: z.string().trim().max(120).default(''),
  size: z.coerce.number().int().min(0).max(1024 * 1024 * 1024).default(0),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  language: z.enum(['bn', 'en', 'mixed', 'other']).default('bn'),
  tags: tagListSchema,
  topicTags: tagListSchema,
  order: z.coerce.number().int().min(0).max(100000).default(0),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  metadataSource: z.string().trim().max(60).default('manual'),
})

export const createResourceSchema = resourceBaseSchema.superRefine((data, ctx) => {
  if (data.type === 'youtube' && !data.youtubeId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['youtubeId'], message: 'YouTube ID is required' })
  }

  if (['pdf', 'link', 'image', 'file'].includes(data.type) && !data.url && !data.imagekitUrl && !data.assetId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['url'], message: 'A URL or uploaded asset is required' })
  }
})

export const updateResourceSchema = resourceBaseSchema.partial()

export const reorderItemsSchema = z.object({
  orderedIds: z.array(objectIdSchema).min(1).max(500),
  categoryId: objectIdSchema.optional(),
}).refine(
  (data) => new Set(data.orderedIds).size === data.orderedIds.length,
  { path: ['orderedIds'], message: 'Duplicate ids are not allowed' },
)

export const youtubePreviewSchema = z.object({
  url: z.string().trim().min(1).max(1200),
})

export const youtubePlaylistPreviewSchema = z.object({
  url: z.string().trim().min(1).max(1200),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const youtubePlaylistImportSchema = z.object({
  categoryId: objectIdSchema,
  playlistId: z.string().trim().min(1).max(80),
  videos: z.array(resourceBaseSchema.omit({ categoryId: true }).extend({
    youtubeId: z.string().trim().min(1).max(40),
    youtubePlaylistId: z.string().trim().min(1).max(80),
  })).min(1).max(100),
})

export const imageKitAssetSchema = z.object({
  fileHash: z.string().trim().toLowerCase().regex(/^[a-f0-9]{64}$/, 'File hash must be SHA-256 hex'),
  fileName: z.string().trim().min(1).max(260),
  mimeType: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .refine(
      (value) => (
        ALLOWED_UPLOAD_MIME_TYPES.has(value) || value.startsWith('image/')
      ),
      'Only image, PDF, text, ZIP, Office, or generic file uploads are allowed',
    ),
  size: z.coerce.number().int().min(1).max(50 * 1024 * 1024),
  imagekitFileId: z.string().trim().min(1).max(180),
  imagekitUrl: z.string().trim().min(1).max(1200).refine(safeResourceUrl, 'ImageKit URL must be valid'),
  thumbnailUrl: optionalUrlSchema,
  folder: z.string().trim().max(260).default('/resources').refine(
    (value) => value === '/resources' || value.startsWith('/resources/'),
    'Uploads must stay under /resources',
  ),
})

export const resourceProgressSchema = z.object({
  resourceId: objectIdSchema,
  progressSeconds: z.coerce.number().int().min(0).max(604800).default(0),
  completed: z.boolean().default(false),
})

// Helpers

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
