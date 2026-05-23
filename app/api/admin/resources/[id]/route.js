import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { enforceSameOrigin } from '@/lib/requestSecurity'
import { validate, updateResourceSchema } from '@/lib/validation'
import Resource from '@/lib/models/Resource'
import ResourceCategory from '@/lib/models/ResourceCategory'
import ResourceProgress from '@/lib/models/ResourceProgress'
import UploadedAsset from '@/lib/models/UploadedAsset'
import { serialize } from '@/lib/resourceUtils'
import { normalizeResourcePayload } from '@/lib/resourcePayload'
import { invalidIdResponse, isValidObjectId } from '@/lib/routeParams'

export async function PUT(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

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

        const payload = normalizeResourcePayload({
          ...parsed.data,
          updatedBy: adminCheck.admin?.username || 'admin',
        })

        resource = await Resource.findByIdAndUpdate(id, { $set: payload }, { new: true })
          .session(session)
          .lean()

        const oldAssetId = existing.assetId?.toString()
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
      throw txError
    } finally {
      await session.endSession()
    }

    return NextResponse.json(serialize(resource))
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'This YouTube video or unique resource already exists.' }, { status: 409 })
    }
    logger.error('[PUT /api/admin/resources/[id]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const originCheck = enforceSameOrigin(request)
  if (originCheck) return originCheck

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) return adminCheck.response

  try {
    const { id } = await params
    if (!isValidObjectId(id)) return invalidIdResponse('resource id')

    await connectDB()

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        const resource = await Resource.findByIdAndDelete(id).session(session).lean()
        if (!resource) throw new Error('RESOURCE_NOT_FOUND')

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

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('[DELETE /api/admin/resources/[id]]', { error })
    return NextResponse.json({ error: logger.safeErrorMessage(error) }, { status: 500 })
  }
}
