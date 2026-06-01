import { getSiteUrl } from '@/lib/site'
import { connectDB } from '@/lib/db'
import Exam from '@/lib/models/Exam'

export default async function sitemap() {
  const baseUrl = getSiteUrl()
  const staticLastModified = new Date()

  const staticRoutes = [
    { url: `${baseUrl}/`, lastModified: staticLastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/exams`, lastModified: staticLastModified, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/leaderboard`, lastModified: staticLastModified, changeFrequency: 'daily', priority: 0.75 },
    { url: `${baseUrl}/privacy`, lastModified: staticLastModified, changeFrequency: 'yearly', priority: 0.25 },
    { url: `${baseUrl}/terms`, lastModified: staticLastModified, changeFrequency: 'yearly', priority: 0.25 },
  ]

  let dynamicRoutes = []
  try {
    await connectDB()
    const exams = await Exam.find({ published: true }, { _id: 1, updatedAt: 1, createdAt: 1 }).lean()

    const examRoutes = exams.flatMap((exam) => [
      { url: `${baseUrl}/exam/${exam._id}`, lastModified: exam.updatedAt || exam.createdAt || staticLastModified, changeFrequency: 'weekly', priority: 0.7 },
      { url: `${baseUrl}/leaderboard/${exam._id}`, lastModified: exam.updatedAt || exam.createdAt || staticLastModified, changeFrequency: 'daily', priority: 0.55 },
    ])
    dynamicRoutes = examRoutes
  } catch (error) {
    console.error('Failed to load dynamic routes for sitemap', error)
  }

  return [...staticRoutes, ...dynamicRoutes]
}
