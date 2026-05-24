import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { validate, createResourceSchema } from '@/lib/validation'
import { logAdminAction } from '@/lib/auditLog'
import Resource from '@/lib/models/Resource'
import ResourceCategory from '@/lib/models/ResourceCategory'
import UploadedAsset from '@/lib/models/UploadedAsset'
import { RESOURCE_TYPES, escapeRegex, normalizeSearchQuery, serialize } from '@/lib/resourceUtils'
import { normalizeResourcePayload } from '@/lib/resourcePayload'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'
import { invalidateResourceCaches } from '@/lib/publicCache'

export async function GET(request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')?.trim()
    const type = searchParams.get('type')?.trim()
    const q = normalizeSearchQuery(searchParams.get('q'))
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const rawLimit = !limitParam?.trim() ? NaN : Number(limitParam)
    const rawOffset = !offsetParam?.trim() ? NaN : Number(offsetParam)
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 100, 1), 200)
    const offset = Math.max(Number.isFinite(rawOffset) ? Math.trunc(rawOffset) : 0, 0)

    const query = {}
    if (categoryId) {
      if (!isValidObjectId(categoryId)) return invalidIdResponse('category id')
      query.categoryId = categoryId
    }
    if (type && RESOURCE_TYPES.includes(type)) query.type = type
    if (q && q.length >= 2) {
      const safePattern = escapeRegex(q)
      query.$or = [
        { title: { $regex: safePattern, $options: 'i' } },
        { description: { $regex: safePattern, $options: 'i' } },
        { tags: { $regex: safePattern, $options: 'i' } },
      ]
    }

    const resources = await Resource.find(query)
      .populate('categoryId', 'name slug icon color')
      .sort({ categoryId: 1, order: 1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean()
    const totalCount = await Resource.countDocuments(query)

    return NextResponse.json({
      resources: serialize(resources),
      totalCount,
      limit,
      offset,
      hasMore: offset + resources.length < totalCount,
    })
  } catch (error) {
    logger.error('[GET /api/admin/resources]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    const raw = await request.json()
    const parsed = validate(createResourceSchema, raw)
    if (!parsed.success) return parsed.response

    await connectDB()
    let resource
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        const category = await ResourceCategory.exists({ _id: parsed.data.categoryId }).session(session)
        if (!category) throw new Error('CATEGORY_NOT_FOUND')

        const maxOrder = await Resource.findOne({ categoryId: parsed.data.categoryId }, { order: 1 })
          .sort({ order: -1 })
          .session(session)
          .lean()

        const payload = normalizeResourcePayload({
          ...parsed.data,
          order: raw.order === undefined ? (maxOrder?.order || 0) + 1 : parsed.data.order,
          createdBy: adminCheck.admin?.username || 'admin',
          updatedBy: adminCheck.admin?.username || 'admin',
        })

        if (payload.assetId) {
          const asset = await UploadedAsset.findOne({ _id: payload.assetId }, { _id: 1 }).session(session).lean()
          if (!asset) throw new Error('ASSET_NOT_FOUND')
        }

        const created = await Resource.create([payload], { session })
        resource = created[0]
        if (resource.assetId) {
          await UploadedAsset.updateOne(
            { _id: resource.assetId },
            { $inc: { referenceCount: 1 } },
            { session },
          )
        }
      })
    } catch (txError) {
      if (txError.message === 'CATEGORY_NOT_FOUND') {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }
      if (txError.message === 'ASSET_NOT_FOUND') {
        return NextResponse.json({ error: 'Uploaded asset not found' }, { status: 400 })
      }
      throw txError
    } finally {
      await session.endSession()
    }

    await logAdminAction(request, adminCheck.admin, 'CREATE_RESOURCE', resource._id, {
      title: resource.title,
      type: resource.type,
      categoryId: resource.categoryId?.toString(),
      published: resource.published,
    })
    await invalidateResourceCaches()

    return NextResponse.json(serialize(resource), { status: 201 })
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'This YouTube video or unique resource already exists.' }, { status: 409 })
    }
    logger.error('[POST /api/admin/resources]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
