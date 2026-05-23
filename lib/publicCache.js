import { connectDB } from '@/lib/db'
import { getCachedJson, deleteCacheKeys } from '@/lib/redisCache'
import Exam from '@/lib/models/Exam'
import Question from '@/lib/models/Question'
import Resource from '@/lib/models/Resource'
import ResourceCategory from '@/lib/models/ResourceCategory'
import {
  RESOURCE_LEVELS,
  RESOURCE_TYPES,
  escapeRegex,
  isObjectId,
  normalizeSearchQuery,
  publicResourceSlug,
  serialize,
  toPublicResources,
} from '@/lib/resourceUtils'
import {
  getLeaderboardData,
  getRankedLiveSubmissions,
  toPublicLeaderboardSubmission,
} from '@/lib/leaderboard'

const TTL = {
  homeRecentExams: 60,
  exams: 30,
  examDetail: 60,
  resourceLists: 300,
  resourceWatch: 900,
  leaderboard: 60,
}

function stableKeyPart(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function toPublicExam(exam) {
  return {
    _id: exam._id.toString(),
    title: exam.title,
    duration: exam.duration,
    liveStart: exam.liveStart || null,
    liveEnd: exam.liveEnd || null,
    published: Boolean(exam.published),
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
  }
}

function toPublicQuestion(question) {
  return {
    _id: question._id.toString(),
    question: question.question,
    options: question.options,
    order: question.order,
  }
}

export async function getCachedHomeRecentExams() {
  return getCachedJson('home:recent-exams', async () => {
    await connectDB()
    const exams = await Exam.find(
      { published: true },
      { title: 1, duration: 1, liveStart: 1, liveEnd: 1, createdAt: 1 },
    )
      .sort({ createdAt: -1 })
      .limit(6)
      .lean()

    return serialize(exams.map((exam) => ({
      _id: exam._id.toString(),
      title: exam.title,
      duration: exam.duration,
      liveStart: exam.liveStart || null,
      liveEnd: exam.liveEnd || null,
      createdAt: exam.createdAt,
    })))
  }, TTL.homeRecentExams)
}

export async function getCachedPublishedExams() {
  return getCachedJson('exams:list', async () => {
    await connectDB()
    const exams = await Exam.find({ published: true }, {
      _id: 1,
      title: 1,
      duration: 1,
      liveStart: 1,
      liveEnd: 1,
      published: 1,
      createdAt: 1,
      updatedAt: 1,
    }).sort({ createdAt: -1 }).lean()

    return serialize(exams.map(toPublicExam))
  }, TTL.exams)
}

export async function getCachedPublicExamDetail(id) {
  return getCachedJson(`exam:${id}:public`, async () => {
    await connectDB()
    const exam = await Exam.findOne(
      { _id: id, published: true },
      { title: 1, duration: 1, liveStart: 1, liveEnd: 1, createdAt: 1, updatedAt: 1, published: 1 },
    ).lean()

    if (!exam) return null

    const questions = await Question.find(
      { examId: exam._id },
      { question: 1, options: 1, order: 1 },
    ).sort({ order: 1 }).lean()

    return serialize({
      ...toPublicExam(exam),
      questionCount: questions.length,
      questions: questions.map(toPublicQuestion),
    })
  }, TTL.examDetail)
}

export function publicExamWithRuntimeAccess(exam) {
  if (!exam) return null

  const now = new Date()
  const liveStart = exam.liveStart ? new Date(exam.liveStart) : null
  const liveEnd = exam.liveEnd ? new Date(exam.liveEnd) : null
  const protectLiveQuestions = Boolean(liveStart && liveEnd && now <= liveEnd)

  return {
    ...exam,
    requiresAttempt: protectLiveQuestions,
    questions: protectLiveQuestions ? [] : exam.questions,
  }
}

export function publicExamSummary(exam) {
  if (!exam) return null
  const runtimeExam = publicExamWithRuntimeAccess(exam)
  return {
    ...runtimeExam,
    questions: undefined,
  }
}

export async function getCachedResourceCategoriesWithCounts() {
  return getCachedJson('resource-categories', getPublishedCategoriesWithCounts, TTL.resourceLists)
}

export async function getCachedInitialResourcePageData() {
  return getCachedJson('resources:home', async () => {
    await connectDB()

    const [categories, resources, totalCount] = await Promise.all([
      getPublishedCategoriesWithCounts(),
      Resource.find({ published: true })
        .populate('categoryId', 'name slug icon color')
        .sort({ order: 1, createdAt: -1 })
        .limit(80)
        .lean(),
      Resource.countDocuments({ published: true }),
    ])

    return {
      categories,
      resources: serialize(toPublicResources(resources)),
      hasMoreResources: resources.length < totalCount,
      initialDataReady: true,
    }
  }, TTL.resourceLists)
}

export async function getCachedInitialCategoryPageData(slug) {
  return getCachedJson(`resources:category-page:${slug}`, async () => {
    try {
      await connectDB()

      const category = await ResourceCategory.findOne({ slug, published: true }).lean()
      if (!category) {
        return {
          category: null,
          categoryFound: false,
          categories: [],
          resources: [],
          hasMoreResources: false,
          initialDataReady: true,
        }
      }

      const [categories, resources, totalCount] = await Promise.all([
        getPublishedCategoriesWithCounts(),
        Resource.find({ published: true, categoryId: category._id })
          .populate('categoryId', 'name slug icon color')
          .sort({ order: 1, createdAt: -1 })
          .limit(100)
          .lean(),
        Resource.countDocuments({ published: true, categoryId: category._id }),
      ])

      return {
        category: serialize(category),
        categoryFound: true,
        categories,
        resources: serialize(toPublicResources(resources)),
        hasMoreResources: resources.length < totalCount,
        initialDataReady: true,
      }
    } catch {
      return {
        category: null,
        categoryFound: false,
        categories: [],
        resources: [],
        hasMoreResources: false,
        initialDataReady: false,
      }
    }
  }, TTL.resourceLists)
}

export async function getCachedCategoryBySlug(slug) {
  return getCachedJson(`resources:category:${slug}`, async () => {
    try {
      await connectDB()
      return serialize(await ResourceCategory.findOne({ slug, published: true }).lean() || null)
    } catch (err) {
      console.error(`[getCachedCategoryBySlug] Error fetching category slug=${slug}:`, err)
      return null
    }
  }, TTL.resourceLists)
}

export async function getCachedPublicResources(params) {
  const normalized = normalizeResourceParams(params)
  return getCachedJson(`resources:list:${stableKeyPart(normalized)}`, async () => {
    await connectDB()

    const query = { published: true }
    let categoryDoc = null

    if (normalized.type && RESOURCE_TYPES.includes(normalized.type)) query.type = normalized.type
    if (normalized.level && RESOURCE_LEVELS.includes(normalized.level)) query.level = normalized.level
    if (normalized.featured === 'true') query.featured = true

    if (normalized.category) {
      if (isObjectId(normalized.category)) {
        categoryDoc = await ResourceCategory.findOne(
          { _id: normalized.category, published: true },
          { _id: 1, name: 1, slug: 1 },
        ).lean()
      } else {
        categoryDoc = await ResourceCategory.findOne(
          { slug: normalized.category, published: true },
          { _id: 1, name: 1, slug: 1 },
        ).lean()
      }

      if (!categoryDoc) return { resources: [], totalCount: 0, hasMoreResources: false }
      query.categoryId = categoryDoc._id
    }

    if (normalized.q && normalized.q.length >= 2) {
      const safePattern = escapeRegex(normalized.q)
      const matchingCategories = categoryDoc
        ? (
            [categoryDoc.name, categoryDoc.slug].filter(Boolean).join(' ').match(new RegExp(safePattern, 'i'))
              ? [categoryDoc]
              : []
          )
        : await ResourceCategory.find(
          {
            published: true,
            $or: [
              { name: { $regex: safePattern, $options: 'i' } },
              { slug: { $regex: safePattern, $options: 'i' } },
            ],
          },
          { _id: 1 },
        ).lean()

      query.$or = [
        { title: { $regex: safePattern, $options: 'i' } },
        { description: { $regex: safePattern, $options: 'i' } },
        { url: { $regex: safePattern, $options: 'i' } },
        { channelTitle: { $regex: safePattern, $options: 'i' } },
        { tags: { $regex: safePattern, $options: 'i' } },
        { topicTags: { $regex: safePattern, $options: 'i' } },
      ]
      if (matchingCategories.length) {
        query.$or.push({ categoryId: { $in: matchingCategories.map((item) => item._id) } })
      }
    }

    const sortSpec = normalized.sort === 'latest' ? { createdAt: -1 } : { order: 1, createdAt: -1 }
    const resources = await Resource.find(query)
      .populate('categoryId', 'name slug icon color')
      .sort(sortSpec)
      .skip(normalized.offset)
      .limit(normalized.limit)
      .lean()
    const totalCount = await Resource.countDocuments(query)

    return {
      resources: serialize(toPublicResources(resources)),
      totalCount,
      hasMoreResources: normalized.offset + resources.length < totalCount,
    }
  }, TTL.resourceLists)
}

export async function getCachedResourceBySlug(slug) {
  return getCachedJson(`resource:watch:${slug}`, async () => {
    await connectDB()
    const idCandidate = slug.split('-').at(-1)
    const query = {
      published: true,
      type: 'youtube',
      $or: [
        { slug },
        ...(isObjectId(idCandidate) ? [{ _id: idCandidate }] : []),
      ],
    }

    return serialize(await Resource.findOne(query)
      .populate('categoryId', 'name slug icon color')
      .lean())
  }, TTL.resourceWatch)
}

export async function getCachedSiblingResources(resource) {
  const categoryId = typeof resource.categoryId === 'object' ? resource.categoryId?._id : resource.categoryId
  if (!categoryId) return { previousResource: null, nextResource: null }

  const resourceId = resource._id?.toString()
  return getCachedJson(`resource:siblings:${resourceId}`, async () => {
    await connectDB()
    const resources = await Resource.find(
      { categoryId, published: true, type: 'youtube' },
      { _id: 1, title: 1, slug: 1, order: 1, createdAt: 1 },
    )
      .sort({ order: 1, createdAt: -1 })
      .lean()

    const currentIndex = resources.findIndex((item) => item._id.toString() === resourceId)

    return serialize({
      previousResource: toWatchNavResource(currentIndex > 0 ? resources[currentIndex - 1] : null),
      nextResource: toWatchNavResource(currentIndex >= 0 && currentIndex < resources.length - 1 ? resources[currentIndex + 1] : null),
    })
  }, TTL.resourceWatch)
}

export async function getCachedLeaderboardData() {
  return getCachedJson('leaderboard:global', async () => (
    serialize(await getLeaderboardData())
  ), TTL.leaderboard)
}

export async function getCachedExamLeaderboardData(examId) {
  return getCachedJson(`leaderboard:${examId}`, async () => {
    const submissions = await getRankedLiveSubmissions({ examId })
    return serialize(submissions.map(toPublicLeaderboardSubmission))
  }, TTL.leaderboard)
}

export async function invalidateExamCaches(examId) {
  await deleteCacheKeys([
    'home:recent-exams',
    'exams:list',
    'leaderboard:global',
    examId ? `exam:${examId}:public` : null,
    examId ? `leaderboard:${examId}` : null,
  ])
}

export async function invalidateLeaderboardCaches(examId) {
  await deleteCacheKeys([
    'leaderboard:global',
    examId ? `leaderboard:${examId}` : null,
  ])
}

export async function invalidateResourceCaches() {
  await deleteCacheKeys([
    'resource-categories',
    'resources:*',
    'resource:*',
  ])
}

async function getPublishedCategoriesWithCounts() {
  await connectDB()

  const categories = await ResourceCategory.find({ published: true })
    .sort({ order: 1, name: 1 })
    .lean()

  const counts = await Resource.aggregate([
    { $match: { published: true, categoryId: { $in: categories.map((category) => category._id) } } },
    { $group: { _id: { categoryId: '$categoryId', type: '$type' }, count: { $sum: 1 } } },
  ])

  const countMap = new Map()
  for (const item of counts) {
    const key = item._id.categoryId.toString()
    const current = countMap.get(key) || { total: 0, youtube: 0, pdf: 0, link: 0, image: 0, file: 0 }
    current[item._id.type] = item.count
    current.total += item.count
    countMap.set(key, current)
  }

  return serialize(categories.map((category) => ({
    ...category,
    resourceCounts: countMap.get(category._id.toString()) || { total: 0, youtube: 0, pdf: 0, link: 0, image: 0, file: 0 },
  })))
}

function normalizeResourceParams(params = {}) {
  const rawLimit = Number.isFinite(Number(params.limit)) ? Math.trunc(Number(params.limit)) : 100
  const rawOffset = Number.isFinite(Number(params.offset)) ? Math.trunc(Number(params.offset)) : 0

  return {
    category: String(params.category || '').trim(),
    type: String(params.type || '').trim(),
    level: String(params.level || '').trim(),
    q: normalizeSearchQuery(params.q),
    featured: String(params.featured || '').trim(),
    sort: String(params.sort || '').trim(),
    limit: Math.max(1, Math.min(rawLimit, 200)),
    offset: Math.max(0, rawOffset),
  }
}

function toWatchNavResource(resource) {
  if (!resource) return null
  return {
    title: resource.title,
    href: `/resources/watch/${publicResourceSlug(resource)}`,
  }
}
