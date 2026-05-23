import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { logger } from '@/lib/logger'
import ResourceCategory from '@/lib/models/ResourceCategory'
import Resource from '@/lib/models/Resource'
import { serialize } from '@/lib/resourceUtils'

export const revalidate = 60

export async function GET() {
  try {
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

    return NextResponse.json(
      serialize(categories.map((category) => ({
        ...category,
        resourceCounts: countMap.get(category._id.toString()) || { total: 0, youtube: 0, pdf: 0, link: 0, image: 0, file: 0 },
      }))),
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    )
  } catch (error) {
    logger.error('[GET /api/resources/categories]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
