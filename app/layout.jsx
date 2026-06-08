import './globals.css'
import { Inter } from 'next/font/google'
import AppProviders from '@/components/ThemeProvider'
import AppChrome from '@/components/AppChrome'
import { getSiteUrl } from '@/lib/site'
import { safeJsonLd } from '@/lib/jsonLd'
import { Analytics } from '@vercel/analytics/react'
import PwaRuntime from '@/components/PwaRuntime'
import PwaPushPrompt from '@/components/PwaPushPrompt'

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
    'IT Resource Zone is a free IT learning portal for live and practice exams, instant results, leaderboards, study planning, habit tracking, private dashboards, and curated learning resources.',
  keywords: ['IT exams', 'online quiz', 'study planner', 'habit tracker', 'IT resources', 'leaderboard', 'student dashboard', 'IT Resource Zone'],
  authors: [{ name: 'Atif Hasan', url: 'https://atifhasan.com/' }],
  applicationName: 'IT Resource Zone',
  creator: 'Atif Hasan',
  publisher: 'IT Resource Zone',
  // Canonical URL tells search engines the authoritative address for this site
  alternates: {
    canonical: siteUrl,
    languages: {
      'en-BD': siteUrl,
      'bn-BD': siteUrl,
    },
  },
  icons: {
    icon: [
      { url: '/maskable-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.png', sizes: '1200x1200', type: 'image/png' },
    ],
    shortcut: '/maskable-512.png',
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'IT Resource Zone',
    title: 'IT Resource Zone - IT Exams, Study Planner, and Resources',
    description:
      'Take live and practice IT exams, review instant results, track study habits, save resource progress, and compare rankings on IT Resource Zone.',
    images: [
      {
        url: '/link-preview.jpg',
        width: 1200,
        height: 630,
        alt: 'IT Resource Zone - IT learning and exam portal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IT Resource Zone - IT Exams, Study Planner, and Resources',
    description:
      'Take live and practice IT exams, review instant results, track study habits, save resource progress, and compare rankings on IT Resource Zone.',
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
  alternateName: ['IRZ', 'IT Resource Zone Exam Portal'],
  url: siteUrl,
  description:
    'Free IT learning portal with live and practice exams, leaderboards, private progress dashboards, study planning, habit tracking, admin notifications, and curated resources.',
  author: {
    '@type': 'Person',
    name: 'Atif Hasan',
    url: 'https://atifhasan.com/',
  },
  publisher: {
    '@type': 'Organization',
    name: 'IT Resource Zone',
    url: siteUrl,
    logo: new URL('/maskable-512.png', siteUrl).toString(),
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'IT Resource Zone',
  alternateName: 'IRZ',
  url: siteUrl,
  logo: new URL('/maskable-512.png', siteUrl).toString(),
  sameAs: [
    'https://atifhasan.com/',
  ],
}

const webAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'IT Resource Zone',
  url: siteUrl,
  description:
    'Take timed IT exams, practice past exams, track daily study habits, build weekly plans, save resource progress, receive admin announcements, and compete on leaderboards.',
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
    'Private student dashboard and profile export',
    'Weekly study planner',
    'Daily habit tracker',
    'Curated videos, PDFs, images, links, and files',
    'Optional admin notifications',
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en-BD" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/maskable-512.png" type="image/png" sizes="512x512" />
        <link rel="shortcut icon" href="/maskable-512.png" type="image/png" />
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
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(webAppSchema) }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AppProviders>
          <PwaRuntime />
          <PwaPushPrompt />
          <AppChrome>{children}</AppChrome>
        </AppProviders>
        <Analytics />
      </body>
    </html>
  )
}
