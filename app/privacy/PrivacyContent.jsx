'use client'

import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'

const LAST_UPDATED = 'May 25, 2026'

const sections = [
  {
    title: '1. Information We Collect',
    content: [
      {
        heading: 'Account Information',
        text: 'When you create an account on IT Resource Zone, we collect your name, email address, and a securely hashed password. This information is required to authenticate you and personalize your experience.',
      },
      {
        heading: 'Exam & Performance Data',
        text: 'We record your exam submissions, scores, time taken, and answers to provide you with results, analytics, and leaderboard rankings. Your leaderboard name and exam score may be publicly visible on leaderboard pages. This data is essential to the core functionality of the platform.',
      },
      {
        heading: 'Usage Data',
        text: 'We automatically collect information about how you interact with the platform, including pages visited, features used, device/browser information, approximate location derived from network data, errors, and session activity. This helps us improve reliability, security, and user experience.',
      },
    ],
  },
  {
    title: '2. How We Use Your Information',
    content: [
      {
        heading: 'Platform Functionality',
        text: 'Your data is used to authenticate your account, process exam submissions, calculate scores, and display your ranking on the leaderboard.',
      },
      {
        heading: 'Improvement & Analytics',
        text: 'We use usage and performance analytics to understand how the platform is used and to identify areas for improvement. Analytics may be associated with your account identifier when you are signed in, but we do not sell your personal data or share it with third parties for their own marketing purposes.',
      },
      {
        heading: 'Communications',
        text: 'We may use your email address to send important notices about your account, exam results, or significant platform updates. We do not send unsolicited promotional emails.',
      },
    ],
  },
  {
    title: '3. Data Storage & Security',
    content: [
      {
        heading: 'Storage',
        text: 'Your data is stored securely using industry-standard cloud infrastructure. We take reasonable technical and organizational measures to protect your data from unauthorized access, loss, or misuse.',
      },
      {
        heading: 'Authentication',
        text: 'Account authentication is handled by Clerk, a secure, industry-standard authentication provider. We do not store your raw passwords. All passwords are hashed and salted before storage.',
      },
      {
        heading: 'Data Retention',
        text: 'We retain your account and performance data for as long as your account is active. If you request account deletion, your personal data will be permanently removed within 30 days.',
      },
    ],
  },
  {
    title: '4. Cookies',
    content: [
      {
        heading: 'Session Cookies',
        text: 'We use essential session cookies to keep you logged in and to maintain your exam session state. These cookies are strictly necessary for the platform to function.',
      },
      {
        heading: 'Preference Cookies',
        text: "We store your theme preference (light/dark mode) in your browser's local storage to provide a consistent experience across visits.",
      },
    ],
  },
  {
    title: '5. Third-Party Services',
    content: [
      {
        heading: 'Clerk (Authentication)',
        text: "We use Clerk to manage user authentication. Clerk's own privacy policy governs the data they handle. You can review it at clerk.com.",
      },
      {
        heading: 'Vercel (Hosting)',
        text: 'Our platform is hosted on Vercel. Vercel may collect standard server-side logs (e.g., IP addresses) as part of providing hosting services.',
      },
      {
        heading: 'Vercel Analytics, PostHog, and Sentry',
        text: 'We use Vercel Analytics and PostHog to measure product usage and Sentry to monitor errors and performance. These services may process technical information such as IP address, browser/device data, page URLs, events, and error details.',
      },
      {
        heading: 'ImageKit and YouTube',
        text: 'We use ImageKit to host and deliver resource images/files, and some resource pages embed or link to YouTube videos. When you open these resources, those providers may process your request under their own privacy policies.',
      },
    ],
  },
  {
    title: '6. Your Rights',
    content: [
      {
        heading: 'Access & Correction',
        text: 'You may access and update your profile information at any time through the Profile page on our platform.',
      },
      {
        heading: 'Account Deletion',
        text: 'You have the right to request deletion of your account and all associated personal data. To do so, contact us at itresourcezone@gmail.com.',
      },
      {
        heading: 'Data Portability',
        text: 'You may request a copy of your personal data and exam history by contacting our support team.',
      },
    ],
  },
  {
    title: "7. Children's Privacy",
    content: [
      {
        heading: 'Age Restriction',
        text: 'IT Resource Zone is not directed at children under the age of 13. We do not knowingly collect personal data from children under 13. If you believe a child has provided us with personal data, please contact us immediately.',
      },
    ],
  },
  {
    title: '8. Changes to This Policy',
    content: [
      {
        heading: 'Updates',
        text: 'We may update this Privacy Policy from time to time. We will notify you of any significant changes by updating the "Last Updated" date at the top of this page. Your continued use of the platform after any changes constitutes your acceptance of the new policy.',
      },
    ],
  },
  {
    title: '9. Contact Us',
    content: [
      {
        heading: 'Get in Touch',
        text: 'If you have any questions about this Privacy Policy or how we handle your data, please contact us at itresourcezone@gmail.com. You can also reach us through our Telegram channel at t.me/Itzonei.',
      },
    ],
  },
]

export default function PrivacyContent() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="bg-theme-bg min-h-screen text-theme-primary transition-theme flex flex-col">
      <main className="flex-grow px-4 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-theme-secondary hover:text-theme-accent transition-colors mb-6">
              <i className="fas fa-arrow-left text-xs" />
              Back to Home
            </Link>
            <div className={`rounded-2xl border p-8 ${isDark ? 'border-[#1E2A48] bg-[#0F1524]' : 'border-theme-border bg-white'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-theme-accent/10 flex items-center justify-center">
                  <i className="fas fa-shield-halved text-theme-accent" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-theme-primary">Privacy Policy</h1>
              </div>
              <p className="text-theme-secondary text-sm">Last updated: {LAST_UPDATED}</p>
              <p className="mt-4 text-theme-secondary leading-relaxed">
                At <span className="font-semibold text-theme-primary">IT Resource Zone</span>, your privacy is important to us. This policy explains what data we collect, why we collect it, and how we protect it. By using our platform, you agree to the practices described here.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.title} className={`rounded-2xl border p-6 sm:p-8 transition-colors ${isDark ? 'border-[#1E2A48] bg-[#0F1524]' : 'border-theme-border bg-white'}`}>
                <h2 className="text-lg font-bold text-theme-primary mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-full bg-theme-accent inline-block shrink-0" />
                  {section.title}
                </h2>
                <div className="space-y-4">
                  {section.content.map((item) => (
                    <div key={item.heading}>
                      <h3 className="text-sm font-semibold text-theme-primary mb-1">{item.heading}</h3>
                      <p className="text-sm text-theme-secondary leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-xs text-theme-secondary">
            {'\u00A9'} {new Date().getFullYear()} IT Resource Zone {' | '}
            <Link href="/terms" className="hover:text-theme-accent transition-colors">Terms of Service</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
