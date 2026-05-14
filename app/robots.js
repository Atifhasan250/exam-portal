import { getSiteUrl } from '@/lib/site'

export default function robots() {
  const baseUrl = getSiteUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/admin/'],
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
        disallow: ['/admin', '/admin/', '/api/admin/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
