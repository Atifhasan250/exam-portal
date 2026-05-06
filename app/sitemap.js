export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://it-resource-zone.vercel.app'

  const staticRoutes = [
    { url: `${baseUrl}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/exams`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/leaderboard`, changeFrequency: 'daily', priority: 0.8 },
  ]

  let dynamicRoutes = []
  try {
    const res = await fetch(`${baseUrl}/api/exams`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const exams = await res.json()
      if (Array.isArray(exams)) {
        dynamicRoutes = exams.flatMap((exam) => [
          { url: `${baseUrl}/exam/${exam._id}`, changeFrequency: 'daily', priority: 0.7 },
          { url: `${baseUrl}/leaderboard/${exam._id}`, changeFrequency: 'hourly', priority: 0.6 },
        ])
      }
    }
  } catch {
    // Silently skip dynamic routes on error
  }

  return [...staticRoutes, ...dynamicRoutes]
}
