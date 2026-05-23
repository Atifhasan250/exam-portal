import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import Resource from '@/lib/models/Resource'
import ResourceCategory from '@/lib/models/ResourceCategory'
import {
  RESOURCE_LEVELS,
  RESOURCE_TYPES,
  escapeRegex,
  isObjectId,
  normalizeSearchQuery,
  serialize,
  toPublicResources,
} from '@/lib/resourceUtils'

export const revalidate = 60

export async function GET(request) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')?.trim()
    const type = searchParams.get('type')?.trim()
    const level = searchParams.get('level')?.trim()
    const q = normalizeSearchQuery(searchParams.get('q'))
    const featured = searchParams.get('featured')
    const sort = searchParams.get('sort')?.trim()
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const rawLimit = !limitParam?.trim() ? NaN : Number(limitParam)
    const rawOffset = !offsetParam?.trim() ? NaN : Number(offsetParam)
    const parsedLimit = Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 100
    const parsedOffset = Number.isFinite(rawOffset) ? Math.trunc(rawOffset) : 0
    const limit = Math.max(1, Math.min(parsedLimit, 200))
    const offset = Math.max(0, parsedOffset)

    const query = { published: true }
    let categoryDoc = null

    if (type && RESOURCE_TYPES.includes(type)) query.type = type
    if (level && RESOURCE_LEVELS.includes(level)) query.level = level
    if (featured === 'true') query.featured = true

    if (category) {
      if (isObjectId(category)) {
        categoryDoc = await ResourceCategory.findOne({ _id: category, published: true }, { _id: 1, name: 1, slug: 1 }).lean()
      } else {
        categoryDoc = await ResourceCategory.findOne({ slug: category, published: true }, { _id: 1, name: 1, slug: 1 }).lean()
      }
      if (!categoryDoc) return NextResponse.json([])
      query.categoryId = categoryDoc._id
    }

    if (q && q.length >= 2) {
      const safePattern = escapeRegex(q)
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

    const sortSpec = sort === 'latest' ? { createdAt: -1 } : { order: 1, createdAt: -1 }

    const resources = await Resource.find(query)
      .populate('categoryId', 'name slug icon color')
      .sort(sortSpec)
      .skip(offset)
      .limit(limit)
      .lean()
    const totalCount = await Resource.countDocuments(query)

    return NextResponse.json(serialize(toPublicResources(resources)), {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Total-Count': String(totalCount),
        'X-Has-More': String(offset + resources.length < totalCount),
      },
    })
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) return NextResponse.json([])
    logger.error('[GET /api/resources]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
