import { getSiteUrl } from '@/lib/site'
import { connectDB } from '@/lib/db'
import Exam from '@/lib/models/Exam'

export default async function sitemap() {
  const baseUrl = getSiteUrl()
  const now = new Date()

  const staticRoutes = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/exams`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/tasks`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    // /resources intentionally excluded — page is "Coming Soon" (noindex)
    { url: `${baseUrl}/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  let dynamicRoutes = []
  try {
    // Direct DB query — internal fetch fails silently on Vercel at build time
    await connectDB()
    const exams = await Exam.find({ published: true }, { _id: 1, updatedAt: 1, createdAt: 1 }).lean()
    dynamicRoutes = exams.flatMap((exam) => [
      { url: `${baseUrl}/exam/${exam._id}`, lastModified: exam.updatedAt || exam.createdAt || now, changeFrequency: 'daily', priority: 0.7 },
      { url: `${baseUrl}/leaderboard/${exam._id}`, lastModified: exam.updatedAt || exam.createdAt || now, changeFrequency: 'hourly', priority: 0.6 },
    ])
  } catch {
    // Silently skip dynamic routes on DB error
  }

  return [...staticRoutes, ...dynamicRoutes]
}
