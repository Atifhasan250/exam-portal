import { connectDB } from '@/lib/db'
import { getCachedJson, deleteCacheKeys, getCacheVersion, incrementCacheVersion } from '@/lib/redisCache'
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
  getRankedLiveSubmissionPage,
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
const RESOURCE_CACHE_VERSION = 'v2'

function stableKeyPart(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

async function resourceCacheKey(key) {
  const version = await getCacheVersion('resources')
  return `resources:${RESOURCE_CACHE_VERSION}:v${version}:${key}`
}

async function resourceItemCacheKey(key) {
  const version = await getCacheVersion('resources')
  return `resource:${RESOURCE_CACHE_VERSION}:v${version}:${key}`
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

export async function getCachedPublishedExamPage(params = {}) {
  const normalized = normalizeExamPageParams(params)
  return getCachedJson(`exams:page:${stableKeyPart(normalized)}`, async () => {
    await connectDB()
    const { query, sort } = buildExamPageQuery(normalized.status, normalized.q)
    const [exams, totalCount] = await Promise.all([
      Exam.find(query, {
        _id: 1,
        title: 1,
        duration: 1,
        liveStart: 1,
        liveEnd: 1,
        published: 1,
        createdAt: 1,
        updatedAt: 1,
      })
        .sort(sort)
        .skip(normalized.offset)
        .limit(normalized.limit)
        .lean(),
      Exam.countDocuments(query),
    ])

    return {
      exams: serialize(exams.map(toPublicExam)),
      totalCount,
      limit: normalized.limit,
      offset: normalized.offset,
      nextOffset: normalized.offset + exams.length,
      hasMore: normalized.offset + exams.length < totalCount,
    }
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
  return getCachedJson(await resourceCacheKey('categories'), getPublishedCategoriesWithCounts, TTL.resourceLists)
}

export async function getCachedInitialResourcePageData() {
  return getCachedJson(await resourceCacheKey('home'), async () => {
    await connectDB()

    const [categories, resources, totalCount] = await Promise.all([
      getPublishedCategoriesWithCounts(),
      Resource.find({ published: true })
        .select('-quizQuestions')
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
  return getCachedJson(await resourceCacheKey(`category-page:${slug}`), async () => {
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
          .select('-quizQuestions')
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
  return getCachedJson(await resourceCacheKey(`category:${slug}`), async () => {
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
  return getCachedJson(await resourceCacheKey(`list:${stableKeyPart(normalized)}`), async () => {
    await connectDB()

    const query = { published: true }

    const types = normalized.type
      .split(',')
      .map((type) => type.trim())
      .filter((type) => RESOURCE_TYPES.includes(type))

    if (types.length === 1) query.type = types[0]
    if (types.length > 1) query.type = { $in: [...new Set(types)] }
    if (normalized.level && RESOURCE_LEVELS.includes(normalized.level)) query.level = normalized.level
    if (normalized.featured === 'true') query.featured = true

    if (normalized.category) {
      const categoryDoc = isObjectId(normalized.category)
        ? await ResourceCategory.findOne(
          { _id: normalized.category, published: true },
          { _id: 1, name: 1, slug: 1 },
        ).lean()
        : await ResourceCategory.findOne(
          { slug: normalized.category, published: true },
          { _id: 1, name: 1, slug: 1 },
        ).lean()

      if (!categoryDoc) return { resources: [], totalCount: 0, hasMoreResources: false }
      query.categoryId = categoryDoc._id
    }

    const isSearch = normalized.q && normalized.q.length >= 2
    if (isSearch) {
      const safePattern = escapeRegex(normalized.q)
      const matchingCategories = await ResourceCategory.find(
        {
          published: true,
          $or: [
            { name: { $regex: safePattern, $options: 'i' } },
            { slug: { $regex: safePattern, $options: 'i' } },
          ],
        },
        { _id: 1 },
      ).lean()
      const categoryIds = matchingCategories.map((category) => category._id)
      const fieldFilters = [
        { title: { $regex: safePattern, $options: 'i' } },
        { tags: { $regex: safePattern, $options: 'i' } },
        { topicTags: { $regex: safePattern, $options: 'i' } },
        { channelTitle: { $regex: safePattern, $options: 'i' } },
        { fileName: { $regex: safePattern, $options: 'i' } },
      ]
      if (normalized.q.length >= 4) {
        fieldFilters.push({ description: { $regex: safePattern, $options: 'i' } })
      }
      query.$or = [
        ...fieldFilters,
        ...(categoryIds.length ? [{ categoryId: { $in: categoryIds } }] : []),
      ]
    }

    const sortSpec = isSearch
      ? { order: 1, createdAt: -1 }
      : normalized.sort === 'latest'
        ? { createdAt: -1 }
        : { order: 1, createdAt: -1 }
    const { resources, totalCount } = await findPublicResourcesPage(query, undefined, sortSpec, normalized)

    return {
      resources: serialize(toPublicResources(resources)),
      totalCount,
      hasMoreResources: normalized.offset + resources.length < totalCount,
    }
  }, TTL.resourceLists)
}

async function findPublicResourcesPage(query, projection, sortSpec, normalized) {
  const [resources, totalCount] = await Promise.all([
    Resource.find(query, projection)
      .select(projection ? undefined : '-quizQuestions')
      .populate('categoryId', 'name slug icon color')
      .sort(sortSpec)
      .skip(normalized.offset)
      .limit(normalized.limit)
      .lean(),
    Resource.countDocuments(query),
  ])

  return { resources, totalCount }
}

export async function getCachedResourceBySlug(slug) {
  return getCachedJson(await resourceItemCacheKey(`watch:${slug}`), async () => {
    await connectDB()
    const idCandidate = slug.split('-').at(-1)
    const baseQuery = { published: true, type: 'youtube' }
    const bySlug = await Resource.findOne({ ...baseQuery, slug })
      .populate('categoryId', 'name slug icon color')
      .lean()

    if (bySlug || !isObjectId(idCandidate)) return serialize(bySlug)

    return serialize(await Resource.findOne({ ...baseQuery, _id: idCandidate })
      .populate('categoryId', 'name slug icon color')
      .lean())
  }, TTL.resourceWatch)
}

export async function getCachedResourcePageBySlug(slug) {
  return getCachedJson(await resourceItemCacheKey(`view:${slug}`), async () => {
    await connectDB()
    const idCandidate = slug.split('-').at(-1)
    const query = {
      published: true,
      type: { $ne: 'youtube' },
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
  return getCachedJson(await resourceItemCacheKey(`siblings:${resourceId}`), async () => {
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

export async function getCachedCategorySiblingResources(resource) {
  const categoryId = typeof resource.categoryId === 'object' ? resource.categoryId?._id : resource.categoryId
  if (!categoryId) return { previousResource: null, nextResource: null }

  const resourceId = resource._id?.toString()
  return getCachedJson(await resourceItemCacheKey(`category-siblings:v2:${resourceId}`), async () => {
    await connectDB()
    const resources = await Resource.find(
      { categoryId, published: true },
      { _id: 1, title: 1, slug: 1, type: 1, order: 1, createdAt: 1 },
    )
      .sort({ order: 1, createdAt: -1 })
      .lean()

    const currentIndex = resources.findIndex((item) => item._id.toString() === resourceId)

    return serialize({
      previousResource: toResourceNavResource(currentIndex > 0 ? resources[currentIndex - 1] : null),
      nextResource: toResourceNavResource(currentIndex >= 0 && currentIndex < resources.length - 1 ? resources[currentIndex + 1] : null),
      resourceNumber: currentIndex >= 0 ? currentIndex + 1 : null,
      resourceTotal: resources.length,
    })
  }, TTL.resourceWatch)
}

export async function getCachedLeaderboardData() {
  return getCachedJson('leaderboard:global', async () => (
    serialize(await getLeaderboardData())
  ), TTL.leaderboard)
}

export async function getCachedExamLeaderboardData(examId, params = {}) {
  const rawLimit = Number.isFinite(Number(params.limit)) ? Math.trunc(Number(params.limit)) : 50
  const rawOffset = Number.isFinite(Number(params.offset)) ? Math.trunc(Number(params.offset)) : 0
  const limit = Math.max(1, Math.min(rawLimit, 100))
  const offset = Math.max(0, rawOffset)

  return getCachedJson(`leaderboard:${examId}:${limit}:${offset}`, async () => {
    await connectDB()
    const exam = await Exam.findOne(
      { _id: examId, published: true },
      { questions: 0 },
    ).lean()

    if (!exam) {
      return {
        exam: null,
        submissions: [],
        submissionCount: 0,
        totalCount: 0,
        limit,
        offset,
        nextOffset: offset,
        hasMore: false,
      }
    }

    const page = await getRankedLiveSubmissionPage({ examId }, { limit, offset })
    return serialize({
      exam,
      submissions: page.submissions.map(toPublicLeaderboardSubmission),
      submissionCount: page.totalCount,
      totalCount: page.totalCount,
      limit: page.limit,
      offset: page.offset,
      nextOffset: page.nextOffset,
      hasMore: page.hasMore,
    })
  }, TTL.leaderboard)
}

export async function invalidateExamCaches(examId) {
  await deleteCacheKeys([
    'home:recent-exams',
    'exams:list',
    'exams:page:*',
    'leaderboard:global',
    examId ? `exam:${examId}:public` : null,
    examId ? `leaderboard:${examId}:*` : null,
  ])
}

export async function invalidateLeaderboardCaches(examId) {
  await deleteCacheKeys([
    'leaderboard:global',
    examId ? `leaderboard:${examId}:*` : null,
  ])
}

export async function invalidateResourceCaches() {
  await incrementCacheVersion('resources')
  await deleteCacheKeys('resource-categories')
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

function normalizeExamPageParams(params = {}) {
  const rawLimit = Number.isFinite(Number(params.limit)) ? Math.trunc(Number(params.limit)) : 12
  const rawOffset = Number.isFinite(Number(params.offset)) ? Math.trunc(Number(params.offset)) : 0
  const status = ['live', 'upcoming', 'past'].includes(params.status) ? params.status : 'past'

  return {
    status,
    q: normalizeSearchQuery(params.q),
    limit: Math.max(1, Math.min(rawLimit, 100)),
    offset: Math.max(0, rawOffset),
  }
}

function buildExamPageQuery(status, searchQuery = '') {
  const now = new Date()
  const titleFilter = searchQuery ? { title: { $regex: escapeRegex(searchQuery), $options: 'i' } } : {}
  if (status === 'live') {
    return {
      query: { published: true, liveStart: { $lte: now }, liveEnd: { $gte: now }, ...titleFilter },
      sort: { liveEnd: 1, _id: 1 },
    }
  }
  if (status === 'upcoming') {
    return {
      query: { published: true, liveStart: { $gt: now }, ...titleFilter },
      sort: { liveStart: 1, _id: 1 },
    }
  }
  return {
    query: { published: true, liveEnd: { $lt: now }, ...titleFilter },
    sort: { liveEnd: -1, _id: 1 },
  }
}

function toWatchNavResource(resource) {
  if (!resource) return null
  return {
    title: resource.title,
    href: `/resources/watch/${publicResourceSlug(resource)}`,
  }
}

function toResourceNavResource(resource) {
  if (!resource) return null
  return {
    title: resource.title,
    href: resource.type === 'youtube'
      ? `/resources/watch/${publicResourceSlug(resource)}`
      : `/resources/view/${publicResourceSlug(resource)}`,
  }
}
