import mongoose from 'mongoose'

const ResourceCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    icon: { type: String, trim: true, maxlength: 80, default: 'fa-book-open' },
    color: { type: String, trim: true, maxlength: 40, default: '#4F46E5' },
    order: { type: Number, default: 0, index: true },
    published: { type: Boolean, default: true, index: true },
    featured: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

ResourceCategorySchema.index({ published: 1, order: 1, name: 1 })
ResourceCategorySchema.index({ featured: 1, published: 1, order: 1 })

export default mongoose.models.ResourceCategory ||
  mongoose.model('ResourceCategory', ResourceCategorySchema)
