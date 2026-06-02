'use client'

import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'

const LAST_UPDATED = 'June 1, 2026'

const sections = [
  {
    title: '1. Information We Collect',
    content: [
      {
        heading: 'Account Information',
        text: 'When you create an account on IT Resource Zone, Clerk processes your sign-in details such as name, email address, profile image, password credentials, and any linked authentication methods. We use this account information to authenticate you, personalize your experience, and show your display name in exams and leaderboards.',
      },
      {
        heading: 'Exam & Performance Data',
        text: 'We record exam attempts, submissions, answers, score, time taken, live/practice status, attempt events, and question review data. This powers results, score history, review pages, analytics, and public leaderboard rankings. Your display name, score, and ranking may be visible on leaderboard pages.',
      },
      {
        heading: 'Learning, Planner, and Resource Data',
        text: 'If you use the dashboard, resources, study planner, habits, browser notifications, or profile export features, we store the related progress, task, habit, push subscription, resource completion, and report data needed to provide those features.',
      },
      {
        heading: 'Usage, Device, and Error Data',
        text: 'We collect information about how the platform is used, including pages visited, feature events, device/browser information, approximate network-derived location, performance data, error details, and session activity. This helps us improve reliability, security, and user experience.',
      },
    ],
  },
  {
    title: '2. How We Use Your Information',
    content: [
      {
        heading: 'Platform Functionality',
        text: 'Your data is used to authenticate your account, process exam submissions, calculate scores, manage live and practice attempts, show history and rankings, track resource progress, run the dashboard, and sync planner and habit data.',
      },
      {
        heading: 'Improvement & Analytics',
        text: 'We use usage and performance analytics to understand how the platform is used and to identify areas for improvement. Analytics may be associated with your account identifier when you are signed in, but we do not sell your personal data or share it with third parties for their own marketing purposes.',
      },
      {
        heading: 'Communications',
        text: 'We may use your email address or browser push subscription to send important account, exam, admin, or platform notices. Browser notifications are optional and can be managed from supported app settings.',
      },
    ],
  },
  {
    title: '3. Data Storage & Security',
    content: [
      {
        heading: 'Storage',
        text: 'Application data is stored using cloud infrastructure including MongoDB and Vercel. Uploaded or resource media may be stored and delivered through ImageKit. We take reasonable technical and organizational measures to protect data from unauthorized access, loss, or misuse.',
      },
      {
        heading: 'Authentication',
        text: 'Student authentication is handled by Clerk. We do not store raw student passwords in the application database. Admin authentication is separate and protected through server-side credentials and secure cookies.',
      },
      {
        heading: 'Data Retention',
        text: 'We retain account, exam, planner, resource, notification, and analytics-linked data for as long as needed to operate the platform and your account. If you delete your account or request deletion, associated application data is removed where technically and legally possible; backups and service logs may take additional time to expire.',
      },
    ],
  },
  {
    title: '4. Cookies',
    content: [
      {
        heading: 'Session Cookies',
        text: 'We use essential cookies and local browser storage to keep you logged in, protect admin sessions, maintain exam/session state, support the PWA experience, and remember required preferences.',
      },
      {
        heading: 'Preference Cookies',
        text: "We store preferences such as light/dark theme and app state in your browser's local storage so the interface stays consistent across visits.",
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
        heading: 'MongoDB Atlas and Upstash',
        text: 'We use MongoDB for application data. Upstash Redis may be used for rate limiting, caching, or abuse prevention on selected features such as admin login.',
      },
      {
        heading: 'Vercel Analytics, PostHog, and Sentry',
        text: 'We use Vercel Analytics and PostHog to measure product usage and Sentry to monitor errors and performance. These services may process technical information such as IP address, browser/device data, page URLs, events, and error details.',
      },
      {
        heading: 'ImageKit and YouTube',
        text: 'We use ImageKit to host and deliver resource images/files, and some resource pages embed or link to YouTube videos. When you open these resources, those providers may process your request under their own privacy policies.',
      },
      {
        heading: 'Web Push Providers',
        text: 'If you enable browser notifications, browser push services may process the technical delivery of notifications according to the provider for your browser or device.',
      },
    ],
  },
  {
    title: '6. Your Rights',
    content: [
      {
        heading: 'Access & Correction',
        text: 'You may access and update your profile information through the Profile page. You can also export a learning report from your profile.',
      },
      {
        heading: 'Account Deletion',
        text: 'You can delete your account from the Profile page where available, or request deletion by contacting itresourcezone@gmail.com.',
      },
      {
        heading: 'Data Portability',
        text: 'You may request a copy of personal data and exam history by contacting our support team. The profile export provides a user-facing learning report, not a complete technical data archive.',
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
