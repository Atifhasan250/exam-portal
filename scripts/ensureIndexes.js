/**
 * scripts/ensureIndexes.js
 *
 * Connects to MongoDB and synchronizes all Mongoose model indexes.
 * Run: node scripts/ensureIndexes.js
 *
 * Requires MONGO_URI environment variable.
 */

import 'dotenv/config'
import mongoose from 'mongoose'

// Import all models to register their schemas
import '../lib/models/Exam.js'
import '../lib/models/ExamAttempt.js'
import '../lib/models/PracticeAttempt.js'
import '../lib/models/Question.js'
import '../lib/models/Submission.js'
import '../lib/models/PlannerData.js'
import '../lib/models/Resource.js'
import '../lib/models/ResourceCategory.js'
import '../lib/models/ResourceProgress.js'
import '../lib/models/UploadedAsset.js'
import '../lib/models/AdminAuditLog.js'

async function ensureIndexes() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('❌ MONGO_URI environment variable is not set.')
    process.exit(1)
  }

  console.log('🔌 Connecting to MongoDB...')
  await mongoose.connect(uri, { bufferCommands: false })
  console.log('✅ Connected.\n')

  const modelNames = mongoose.modelNames()
  for (const name of modelNames) {
    const model = mongoose.model(name)
    console.log(`📋 Syncing indexes for: ${name}`)
    await model.syncIndexes()
    const indexes = await model.collection.indexes()
    console.log(`   → ${indexes.length} indexes confirmed.`)
  }

  console.log('\n✅ All indexes synchronized successfully.')
  await mongoose.disconnect()
  process.exit(0)
}

ensureIndexes().catch((error) => {
  console.error('❌ Failed to sync indexes:', error.message)
  process.exit(1)
})
