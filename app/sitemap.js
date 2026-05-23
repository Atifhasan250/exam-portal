import { getSiteUrl } from '@/lib/site'
import { connectDB } from '@/lib/db'
import Exam from '@/lib/models/Exam'
import Resource from '@/lib/models/Resource'
import ResourceCategory from '@/lib/models/ResourceCategory'
import { publicResourceSlug } from '@/lib/resourceUtils'

export default async function sitemap() {
  const baseUrl = getSiteUrl()
  const staticLastModified = new Date('2026-05-23T00:00:00.000Z')

  const staticRoutes = [
    { url: `${baseUrl}/`, lastModified: staticLastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/exams`, lastModified: staticLastModified, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/resources`, lastModified: staticLastModified, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/leaderboard`, lastModified: staticLastModified, changeFrequency: 'daily', priority: 0.75 },
    { url: `${baseUrl}/privacy`, lastModified: staticLastModified, changeFrequency: 'yearly', priority: 0.25 },
    { url: `${baseUrl}/terms`, lastModified: staticLastModified, changeFrequency: 'yearly', priority: 0.25 },
  ]

  let dynamicRoutes = []
  try {
    await connectDB()
    const [exams, categories, videos] = await Promise.all([
      Exam.find({ published: true }, { _id: 1, updatedAt: 1, createdAt: 1 }).lean(),
      ResourceCategory.find({ published: true }, { slug: 1, updatedAt: 1, createdAt: 1 }).lean(),
      Resource.find({ published: true, type: 'youtube' }, { _id: 1, title: 1, slug: 1, updatedAt: 1, createdAt: 1 }).lean(),
    ])

    const examRoutes = exams.flatMap((exam) => [
      { url: `${baseUrl}/exam/${exam._id}`, lastModified: exam.updatedAt || exam.createdAt || staticLastModified, changeFrequency: 'weekly', priority: 0.7 },
      { url: `${baseUrl}/leaderboard/${exam._id}`, lastModified: exam.updatedAt || exam.createdAt || staticLastModified, changeFrequency: 'daily', priority: 0.55 },
    ])
    const categoryRoutes = categories.filter((category) => category.slug).map((category) => ({
      url: `${baseUrl}/resources/${category.slug}`,
      lastModified: category.updatedAt || category.createdAt || staticLastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))
    const videoRoutes = videos.map((resource) => ({
      url: `${baseUrl}/resources/watch/${publicResourceSlug(resource)}`,
      lastModified: resource.updatedAt || resource.createdAt || staticLastModified,
      changeFrequency: 'monthly',
      priority: 0.65,
    }))

    dynamicRoutes = [...examRoutes, ...categoryRoutes, ...videoRoutes]
  } catch (error) {
    console.error('Failed to load dynamic routes for sitemap', error)
  }

  return [...staticRoutes, ...dynamicRoutes]
}
