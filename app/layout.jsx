import './globals.css'
import { Inter } from 'next/font/google'
import AppProviders from '@/components/ThemeProvider'
import AppChrome from '@/components/AppChrome'
import { getSiteUrl } from '@/lib/site'
import { safeJsonLd } from '@/lib/jsonLd'
import { Analytics } from '@vercel/analytics/react'
import PwaRuntime from '@/components/PwaRuntime'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const siteUrl = getSiteUrl()

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'IT Resource Zone',
    template: '%s | IT Resource Zone',
  },
  description:
    'IT Resource Zone is a free online platform for IT exams, study planning, daily habits tracking, and learning resources. Test your knowledge, build consistency, and climb the leaderboard.',
  keywords: ['IT exams', 'online quiz', 'study planner', 'habit tracker', 'IT resources', 'leaderboard', 'IT Resource Zone'],
  authors: [{ name: 'Atif Hasan', url: 'https://atifhasan.com/' }],
  creator: 'Atif Hasan',
  // Canonical URL tells search engines the authoritative address for this site
  alternates: {
    canonical: siteUrl,
    languages: {
      'en-BD': siteUrl,
      'bn-BD': siteUrl,
    },
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'IT Resource Zone',
    title: 'IT Resource Zone - Free Online IT Exams and Rankings',
    description:
      'Test your IT knowledge, track daily study habits, and access curated IT resources. Compete with peers and climb the leaderboard.',
    images: [
      {
        url: '/link-preview.jpg',
        width: 1200,
        height: 630,
        alt: 'IT Resource Zone - Online IT Exams Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IT Resource Zone - Free Online IT Exams and Rankings',
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

// JSON-LD Structured Data
// Schema.org markup tells Google exactly what this site is, enabling rich results.
// Test at: https://search.google.com/test/rich-results

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'IT Resource Zone',
  url: siteUrl,
  description:
    'Free online platform for IT exams, study planning, daily habits tracking, and learning resources.',
  author: {
    '@type': 'Person',
    name: 'Atif Hasan',
    url: 'https://atifhasan.com/',
  },
}

const webAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'IT Resource Zone',
  url: siteUrl,
  description:
    'Take timed IT exams, track daily study habits, build weekly plans, and compete on the leaderboard. Free for all beginner IT students.',
  applicationCategory: 'EducationApplication',
  operatingSystem: 'Web',
  inLanguage: ['en-BD', 'bn-BD'],
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'BDT',
  },
  author: {
    '@type': 'Person',
    name: 'Atif Hasan',
    url: 'https://atifhasan.com/',
  },
  featureList: [
    'Live timed IT exams',
    'Instant exam results and score tracking',
    'Leaderboard with rankings',
    'Weekly study planner',
    'Daily habit tracker',
    'Free learning resources',
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en-BD" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="style"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        />
        <link
          id="font-awesome-css"
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        />
        {/* JSON-LD structured data for Google rich results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(webAppSchema) }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AppProviders>
          <PwaRuntime />
          <AppChrome>{children}</AppChrome>
        </AppProviders>
        <Analytics />
      </body>
    </html>
  )
}
