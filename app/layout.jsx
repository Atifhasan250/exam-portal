import './globals.css'
import { Inter } from 'next/font/google'
import AppProviders from '@/components/ThemeProvider'
import AppChrome from '@/components/AppChrome'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://it-resource-zone.vercel.app'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'IT Resource Zone',
    template: '%s | IT Resource Zone',
  },
  description:
    'IT Resource Zone is a free online platform for IT exams, study planning, daily habits tracking, and learning resources. Test your knowledge, build consistency, and climb the leaderboard.',
  keywords: ['IT exams', 'online quiz', 'study planner', 'habit tracker', 'IT resources', 'leaderboard', 'IT Resource Zone'],
  authors: [{ name: 'Atif Hasan', url: 'https://atifs-portfolio.vercel.app/' }],
  creator: 'Atif Hasan',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'IT Resource Zone',
    title: 'IT Resource Zone — Free Online IT Exams & Rankings',
    description:
      'Test your IT knowledge, track daily study habits, and access curated IT resources. Compete with peers and climb the leaderboard.',
    images: [
      {
        url: '/link-preview.jpg',
        width: 1200,
        height: 630,
        alt: 'IT Resource Zone — Online IT Exams Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IT Resource Zone — Free Online IT Exams & Rankings',
    description:
      'Test your IT knowledge, track daily study habits, and access curated IT resources. Compete with peers and climb the leaderboard.',
    images: ['/link-preview.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: {
      'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || undefined,
    },
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        />
      </head>
      <body className={inter.className}>
        <AppProviders>
          <AppChrome>{children}</AppChrome>
        </AppProviders>
      </body>
    </html>
  )
}
