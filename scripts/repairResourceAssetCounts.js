import 'dotenv/config'
import mongoose from 'mongoose'
import Resource from '../lib/models/Resource.js'
import UploadedAsset from '../lib/models/UploadedAsset.js'

async function repairResourceAssetCounts() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI environment variable is not set.')
    process.exit(1)
  }

  await mongoose.connect(uri, { bufferCommands: false })

  const counts = await Resource.aggregate([
    { $match: { assetId: { $exists: true, $ne: null } } },
    { $group: { _id: '$assetId', count: { $sum: 1 } } },
  ])
  const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]))
  const assets = await UploadedAsset.find({}, { _id: 1 }).lean()
  const batchSize = 500

  for (let index = 0; index < assets.length; index += batchSize) {
    const operations = assets.slice(index, index + batchSize).map((asset) => ({
      updateOne: {
        filter: { _id: asset._id },
        update: { $set: { referenceCount: countMap.get(asset._id.toString()) || 0 } },
      },
    }))
    if (operations.length) await UploadedAsset.bulkWrite(operations, { ordered: false })
  }

  console.log(`Repaired reference counts for ${assets.length} uploaded assets.`)
  await mongoose.disconnect()
}

repairResourceAssetCounts().catch(async (error) => {
  console.error('Failed to repair resource asset counts:', error.message)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
