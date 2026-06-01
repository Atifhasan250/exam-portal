import { getSiteUrl } from '@/lib/site'

export default function robots() {
  const baseUrl = getSiteUrl()
  const privatePaths = [
    '/admin',
    '/admin/',
    '/api/',
    '/api/admin/',
    '/dashboard',
    '/dashboard/',
    '/exams/history',
    '/exams/history/',
    '/profile',
    '/profile/',
    '/resources',
    '/resources/',
    '/sign-in',
    '/sign-in/',
    '/sign-up',
    '/sign-up/',
    '/tasks',
    '/tasks/',
    '/tasks/history',
    '/tasks/history/',
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: privatePaths,
      },
      {
        userAgent: [
          'Googlebot',
          'Bingbot',
          'Applebot',
          'Amazonbot',
          'ChatGPT-User',
          'GPTBot',
          'ClaudeBot',
          'anthropic-ai',
          'PerplexityBot',
          'cohere-ai',
        ],
        allow: '/',
        disallow: privatePaths,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
