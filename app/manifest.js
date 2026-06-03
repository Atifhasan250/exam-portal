import { getSiteUrl } from '@/lib/site'

const siteUrl = getSiteUrl()

export default function manifest() {
  return {
    name: 'IT Resource Zone',
    short_name: 'IRZ',
    description:
      'Free IT exams, instant results, leaderboards, study planning, habit tracking, admin notifications, private dashboards, and curated learning resources.',
    id: '/',
    start_url: '/?app=1',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#081126',
    theme_color: '#6366F1',
    categories: ['education', 'productivity'],
    lang: 'en',
    dir: 'ltr',
    launch_handler: {
      client_mode: 'navigate-existing',
    },
    screenshots: [
      {
        src: `${siteUrl}/link-preview.jpg`,
        sizes: '1200x630',
        type: 'image/jpeg',
        form_factor: 'wide',
        label: 'IT Resource Zone dashboard preview',
      },
    ],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
