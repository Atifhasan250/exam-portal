import { getSiteUrl } from '@/lib/site'
import { connectDB } from '@/lib/db'
import Exam from '@/lib/models/Exam'
import Resource from '@/lib/models/Resource'
import ResourceCategory from '@/lib/models/ResourceCategory'

export default async function sitemap() {
  const baseUrl = getSiteUrl()
  const now = new Date()

  const staticRoutes = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/exams`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/tasks`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/resources`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  let dynamicRoutes = []
  try {
    await connectDB()
    const [exams, categories, videos] = await Promise.all([
      Exam.find({ published: true }, { _id: 1, updatedAt: 1, createdAt: 1 }).lean(),
      ResourceCategory.find({ published: true }, { slug: 1, updatedAt: 1, createdAt: 1 }).lean(),
      Resource.find({ published: true, type: 'youtube' }, { slug: 1, updatedAt: 1, createdAt: 1 }).lean(),
    ])

    const examRoutes = exams.flatMap((exam) => [
      { url: `${baseUrl}/exam/${exam._id}`, lastModified: exam.updatedAt || exam.createdAt || now, changeFrequency: 'daily', priority: 0.7 },
      { url: `${baseUrl}/leaderboard/${exam._id}`, lastModified: exam.updatedAt || exam.createdAt || now, changeFrequency: 'hourly', priority: 0.6 },
    ])
    const categoryRoutes = categories.filter((category) => category.slug).map((category) => ({
      url: `${baseUrl}/resources/${category.slug}`,
      lastModified: category.updatedAt || category.createdAt || now,
      changeFrequency: 'weekly',
      priority: 0.65,
    }))
    const videoRoutes = videos.filter((resource) => resource.slug).map((resource) => ({
      url: `${baseUrl}/resources/watch/${resource.slug}`,
      lastModified: resource.updatedAt || resource.createdAt || now,
      changeFrequency: 'monthly',
      priority: 0.55,
    }))

    dynamicRoutes = [...examRoutes, ...categoryRoutes, ...videoRoutes]
  } catch {
    // Silently skip dynamic routes on DB error.
  }

  return [...staticRoutes, ...dynamicRoutes]
}
