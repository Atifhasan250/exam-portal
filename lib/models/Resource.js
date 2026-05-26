import mongoose from 'mongoose'

const RESOURCE_TYPES = ['youtube', 'pdf', 'link', 'image', 'file']
const RESOURCE_LEVELS = ['beginner', 'intermediate', 'advanced']
const RESOURCE_LANGUAGES = ['bn', 'en', 'hi', 'mixed', 'other']

const ResourceSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResourceCategory',
      required: true,
      index: true,
    },
    type: { type: String, enum: RESOURCE_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 220 },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 280,
      sparse: true,
      unique: true,
      set: (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    transcriptText: { type: String, trim: true, maxlength: 200000, default: '' },
    url: { type: String, trim: true, maxlength: 1200, default: '' },
    thumbnailUrl: { type: String, trim: true, maxlength: 1200, default: '' },

    youtubeId: {
      type: String,
      trim: true,
      maxlength: 40,
      sparse: true,
      unique: true,
      set: (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    },
    youtubePlaylistId: { type: String, trim: true, maxlength: 80, default: '' },
    channelTitle: { type: String, trim: true, maxlength: 180, default: '' },
    durationSeconds: { type: Number, default: 0, min: 0 },
    sourcePublishedAt: { type: Date },

    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'UploadedAsset', index: true },
    imagekitFileId: { type: String, trim: true, maxlength: 180, default: '' },
    imagekitUrl: { type: String, trim: true, maxlength: 1200, default: '' },
    fileName: { type: String, trim: true, maxlength: 260, default: '' },
    mimeType: { type: String, trim: true, maxlength: 120, default: '' },
    size: { type: Number, default: 0, min: 0 },

    level: { type: String, enum: RESOURCE_LEVELS, default: 'beginner', index: true },
    language: { type: String, enum: RESOURCE_LANGUAGES, default: 'bn', index: true },
    tags: [{ type: String, trim: true, maxlength: 60 }],
    topicTags: [{ type: String, trim: true, maxlength: 80 }],
    order: { type: Number, default: 0, index: true },
    published: { type: Boolean, default: false, index: true },
    featured: { type: Boolean, default: false, index: true },
    metadataSource: { type: String, trim: true, maxlength: 60, default: 'manual' },
    metadataFetchedAt: { type: Date },
    createdBy: { type: String, trim: true, maxlength: 120, default: '' },
    updatedBy: { type: String, trim: true, maxlength: 120, default: '' },
  },
  { timestamps: true },
)

ResourceSchema.index({ published: 1, categoryId: 1, type: 1, order: 1 })
ResourceSchema.index({ published: 1, featured: 1, order: 1 })
ResourceSchema.index({ published: 1, slug: 1 })
ResourceSchema.index(
  { title: 'text', description: 'text' },
  {
    default_language: 'none',
    language_override: 'textLanguage',
    name: 'resource_title_description_text',
    weights: { title: 10, description: 3 },
  },
)

if (
  process.env.NODE_ENV === 'development' &&
  mongoose.models.Resource &&
  !mongoose.models.Resource.schema.path('transcriptText')
) {
  mongoose.deleteModel('Resource')
}

export default mongoose.models.Resource || mongoose.model('Resource', ResourceSchema)
