import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import Resource from '@/lib/models/Resource'
import ResourceCategory from '@/lib/models/ResourceCategory'
import {
  RESOURCE_TYPES,
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
    const q = normalizeSearchQuery(searchParams.get('q'))
    const featured = searchParams.get('featured')
    const sort = searchParams.get('sort')?.trim()
    const limitParam = searchParams.get('limit')
    const rawLimit = !limitParam?.trim() ? NaN : Number(limitParam)
    const parsedLimit = Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 100
    const limit = Math.max(1, Math.min(parsedLimit, 200))

    const query = { published: true }

    if (type && RESOURCE_TYPES.includes(type)) query.type = type
    if (featured === 'true') query.featured = true

    if (category) {
      let categoryDoc = null
      if (isObjectId(category)) {
        categoryDoc = await ResourceCategory.findOne({ _id: category, published: true }, { _id: 1 }).lean()
      } else {
        categoryDoc = await ResourceCategory.findOne({ slug: category, published: true }, { _id: 1 }).lean()
      }
      if (!categoryDoc) return NextResponse.json([])
      query.categoryId = categoryDoc._id
    }

    if (q && q.length >= 2) {
      query.$text = { $search: q }
    }

    const projection = query.$text ? { score: { $meta: 'textScore' } } : undefined
    const sortSpec = query.$text
      ? { score: { $meta: 'textScore' }, featured: -1, order: 1, createdAt: -1 }
      : sort === 'latest' ? { createdAt: -1 } : { featured: -1, order: 1, createdAt: -1 }

    const resources = await Resource.find(query, projection)
      .populate('categoryId', 'name slug icon color')
      .sort(sortSpec)
      .limit(limit)
      .lean()

    return NextResponse.json(serialize(toPublicResources(resources)), {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) return NextResponse.json([])
    logger.error('[GET /api/resources]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
