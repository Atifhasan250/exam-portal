import mongoose from 'mongoose'

const UploadedAssetSchema = new mongoose.Schema(
  {
    fileHash: { type: String, required: true, unique: true, index: true },
    fileName: { type: String, required: true, trim: true, maxlength: 260 },
    mimeType: { type: String, required: true, trim: true, maxlength: 120 },
    size: { type: Number, required: true, min: 0 },
    imagekitFileId: { type: String, required: true, trim: true, unique: true },
    imagekitUrl: { type: String, required: true, trim: true, maxlength: 1200 },
    thumbnailUrl: { type: String, trim: true, maxlength: 1200, default: '' },
    folder: { type: String, trim: true, maxlength: 260, default: '/resources' },
    uploadedBy: { type: String, trim: true, maxlength: 120, default: '' },
    referenceCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
)

UploadedAssetSchema.index({ mimeType: 1, createdAt: -1 })
UploadedAssetSchema.index({ uploadedBy: 1, createdAt: -1 })

export default mongoose.models.UploadedAsset ||
  mongoose.model('UploadedAsset', UploadedAssetSchema)
