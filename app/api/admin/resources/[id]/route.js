import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { adminMutationRateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { validate, updateResourceSchema } from '@/lib/validation'
import { logAdminAction } from '@/lib/auditLog'
import Resource from '@/lib/models/Resource'
import ResourceCategory from '@/lib/models/ResourceCategory'
import ResourceProgress from '@/lib/models/ResourceProgress'
import UploadedAsset from '@/lib/models/UploadedAsset'
import { serialize } from '@/lib/resourceUtils'
import { normalizeResourcePayload } from '@/lib/resourcePayload'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'
import { invalidateResourceCaches } from '@/lib/publicCache'

export async function GET(_request, { params }) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('resource id')

    await connectDB()
    const resource = await Resource.findById(id)
      .populate('categoryId', 'name slug icon color')
      .lean()

    if (!resource) return NextResponse.json({ error: 'Resource not found' }, { status: 404 })

    return NextResponse.json(serialize(resource))
  } catch (error) {
    logger.error('[GET /api/admin/resources/[id]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  const limited = await adminMutationRateLimit(request, {
    name: 'admin-resource-update',
    keyParts: [adminCheck.admin?.username || 'admin'],
  })
  if (limited) return limited

  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('resource id')

    const raw = await request.json()
    const parsed = validate(updateResourceSchema, raw)
    if (!parsed.success) return parsed.response

    await connectDB()
    let resource
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        if (parsed.data.categoryId) {
          const category = await ResourceCategory.exists({ _id: parsed.data.categoryId }).session(session)
          if (!category) throw new Error('CATEGORY_NOT_FOUND')
        }

        const existing = await Resource.findById(id).session(session).lean()
        if (!existing) throw new Error('RESOURCE_NOT_FOUND')

        const identityIssue = getResourceIdentityIssue({ ...existing, ...parsed.data })
        if (identityIssue) {
          const error = new Error('RESOURCE_VALIDATION_FAILED')
          error.issue = identityIssue
          throw error
        }

        const nextCategoryId = parsed.data.categoryId || existing.categoryId
        const categoryChanged = parsed.data.categoryId
          && parsed.data.categoryId.toString() !== existing.categoryId?.toString()
        const maxOrder = categoryChanged && raw.order === undefined
          ? await Resource.findOne({ categoryId: nextCategoryId }, { order: 1 })
            .sort({ order: -1 })
            .session(session)
            .lean()
          : null

        const payload = normalizeResourcePayload({
          ...parsed.data,
          order: raw.order === undefined
            ? (categoryChanged ? (maxOrder?.order || 0) + 1 : existing.order || 0)
            : parsed.data.order,
          updatedBy: adminCheck.admin?.username || 'admin',
        })

        const oldAssetId = existing.assetId?.toString()
        const requestedAssetId = payload.assetId?.toString()
        if (requestedAssetId && requestedAssetId !== oldAssetId) {
          const asset = await UploadedAsset.findOne({ _id: requestedAssetId }, { _id: 1 }).session(session).lean()
          if (!asset) throw new Error('ASSET_NOT_FOUND')
        }

        resource = await Resource.findByIdAndUpdate(id, { $set: payload }, { new: true })
          .session(session)
          .lean()

        const newAssetId = resource.assetId?.toString()
        if (oldAssetId !== newAssetId) {
          if (oldAssetId) {
            await UploadedAsset.updateOne(
              { _id: oldAssetId, referenceCount: { $gt: 0 } },
              { $inc: { referenceCount: -1 } },
              { session },
            )
          }
          if (newAssetId) {
            await UploadedAsset.updateOne(
              { _id: newAssetId },
              { $inc: { referenceCount: 1 } },
              { session },
            )
          }
        }
      })
    } catch (txError) {
      if (txError.message === 'CATEGORY_NOT_FOUND') {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }
      if (txError.message === 'RESOURCE_NOT_FOUND') {
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
      }
      if (txError.message === 'ASSET_NOT_FOUND') {
        return NextResponse.json({ error: 'Uploaded asset not found' }, { status: 400 })
      }
      if (txError.message === 'RESOURCE_VALIDATION_FAILED') {
        return NextResponse.json(
          { error: 'Validation failed', details: [txError.issue] },
          { status: 400 },
        )
      }
      throw txError
    } finally {
      await session.endSession()
    }

    await logAdminAction(request, adminCheck.admin, 'UPDATE_RESOURCE', resource._id, {
      title: resource.title,
      type: resource.type,
      categoryId: resource.categoryId?.toString(),
      published: resource.published,
    })
    await invalidateResourceCaches()

    return NextResponse.json(serialize(resource))
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'This YouTube video or unique resource already exists.' }, { status: 409 })
    }
    logger.error('[PUT /api/admin/resources/[id]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

function getResourceIdentityIssue(resource) {
  if (resource.type === 'youtube' && !resource.youtubeId) {
    return { path: 'youtubeId', message: 'YouTube ID is required' }
  }

  if (['pdf', 'link', 'image', 'file'].includes(resource.type) && !resource.url && !resource.imagekitUrl && !resource.assetId) {
    return { path: 'url', message: 'A URL or uploaded asset is required' }
  }

  return null
}

export async function DELETE(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  const limited = await adminMutationRateLimit(request, {
    name: 'admin-resource-delete',
    max: 20,
    keyParts: [adminCheck.admin?.username || 'admin'],
  })
  if (limited) return limited

  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('resource id')

    await connectDB()

    let deletedResource
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        const resource = await Resource.findByIdAndDelete(id).session(session).lean()
        if (!resource) throw new Error('RESOURCE_NOT_FOUND')
        deletedResource = resource

        await ResourceProgress.deleteMany({ resourceId: id }).session(session)

        if (resource.assetId) {
          await UploadedAsset.updateOne(
            { _id: resource.assetId, referenceCount: { $gt: 0 } },
            { $inc: { referenceCount: -1 } },
            { session },
          )
        }
      })
    } catch (txError) {
      if (txError.message === 'RESOURCE_NOT_FOUND') {
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
      }
      throw txError
    } finally {
      await session.endSession()
    }

    await logAdminAction(request, adminCheck.admin, 'DELETE_RESOURCE', id, {
      title: deletedResource.title,
      type: deletedResource.type,
      categoryId: deletedResource.categoryId?.toString(),
    })
    await invalidateResourceCaches()

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('[DELETE /api/admin/resources/[id]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
