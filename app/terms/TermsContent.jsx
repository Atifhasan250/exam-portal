'use client'

import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'

const LAST_UPDATED = 'May 10, 2025'

const sections = [
  {
    title: '1. Acceptance of Terms',
    content: [
      {
        heading: 'Agreement',
        text: 'By accessing or using IT Resource Zone ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the platform. We reserve the right to update these terms at any time, and continued use constitutes acceptance.',
      },
    ],
  },
  {
    title: '2. Use of the Platform',
    content: [
      {
        heading: 'Eligibility',
        text: 'You must be at least 13 years old to use IT Resource Zone. By creating an account, you confirm that you meet this age requirement.',
      },
      {
        heading: 'Account Responsibility',
        text: 'You are responsible for maintaining the confidentiality of your account credentials. You must not share your account with others or allow unauthorized access. You are solely responsible for all activity that occurs under your account.',
      },
      {
        heading: 'Accurate Information',
        text: 'You agree to provide accurate and truthful information when creating your account and using the platform. Impersonating another person or entity is strictly prohibited.',
      },
    ],
  },
  {
    title: '3. Exam Rules & Academic Integrity',
    content: [
      {
        heading: 'Honest Participation',
        text: 'You agree to complete all exams honestly and independently. Sharing exam questions, answers, or using unauthorized aids during a live exam session is strictly prohibited and may result in immediate account suspension.',
      },
      {
        heading: 'No Cheating',
        text: "Attempting to manipulate scores, exploit platform vulnerabilities, or interfere with other users' exam sessions is a violation of these terms and may result in permanent account termination.",
      },
      {
        heading: 'Score Integrity',
        text: 'Leaderboard rankings and scores reflect only genuine exam performance. We reserve the right to investigate suspicious activity and remove fraudulent scores at our sole discretion.',
      },
    ],
  },
  {
    title: '4. Intellectual Property',
    content: [
      {
        heading: 'Platform Content',
        text: 'All exam questions, content, graphics, logos, and design elements on IT Resource Zone are the intellectual property of IT Resource Zone or its licensors. You may not copy, reproduce, distribute, or create derivative works from our content without express written permission.',
      },
      {
        heading: 'User Content',
        text: 'By using our platform, you do not gain ownership of any content made available on the platform. All rights are reserved by their respective owners.',
      },
    ],
  },
  {
    title: '5. Prohibited Conduct',
    content: [
      {
        heading: 'You Must Not',
        text: 'Use the platform for any unlawful purpose; attempt to gain unauthorized access to any part of the platform; upload or transmit malicious code, viruses, or harmful content; scrape or harvest data from the platform using automated means; or interfere with the security or proper functioning of the platform.',
      },
      {
        heading: 'Consequences',
        text: 'Violation of these prohibited conduct rules may result in immediate suspension or permanent termination of your account, without prior notice or refund of any kind.',
      },
    ],
  },
  {
    title: '6. Disclaimers',
    content: [
      {
        heading: 'No Warranty',
        text: 'IT Resource Zone is provided "as is" and "as available" without any warranty of any kind, express or implied. We do not guarantee that the platform will be uninterrupted, error-free, or free of harmful components.',
      },
      {
        heading: 'Educational Purpose',
        text: 'The exams and resources on this platform are provided for educational and practice purposes only. We make no guarantee that the content reflects current real-world exam syllabi or official certifications.',
      },
    ],
  },
  {
    title: '7. Limitation of Liability',
    content: [
      {
        heading: 'Liability Cap',
        text: 'To the fullest extent permitted by law, IT Resource Zone and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the platform, including but not limited to loss of data, loss of scores, or loss of opportunity.',
      },
    ],
  },
  {
    title: '8. Termination',
    content: [
      {
        heading: 'Account Termination',
        text: 'We reserve the right to suspend or terminate your account at any time for violation of these Terms of Service, without prior notice. You may also delete your account at any time by contacting itresourcezone@gmail.com.',
      },
      {
        heading: 'Effect of Termination',
        text: 'Upon termination, your right to access the platform ceases immediately. Data associated with your account may be deleted in accordance with our Privacy Policy.',
      },
    ],
  },
  {
    title: '9. Governing Law',
    content: [
      {
        heading: 'Jurisdiction',
        text: 'These Terms of Service shall be governed by and construed in accordance with applicable laws. Any disputes arising from these terms shall be resolved through good-faith negotiation between the parties.',
      },
    ],
  },
  {
    title: '10. Contact Us',
    content: [
      {
        heading: 'Questions',
        text: 'If you have any questions about these Terms of Service, please contact us at itresourcezone@gmail.com or reach out through our Telegram channel at t.me/Itzonei.',
      },
    ],
  },
]

export default function TermsContent() {
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
                  <i className="fas fa-file-contract text-theme-accent" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-theme-primary">Terms of Service</h1>
              </div>
              <p className="text-theme-secondary text-sm">Last updated: {LAST_UPDATED}</p>
              <p className="mt-4 text-theme-secondary leading-relaxed">
                Please read these Terms of Service carefully before using <span className="font-semibold text-theme-primary">IT Resource Zone</span>. These terms govern your access to and use of the platform, including all exams, leaderboards, and related features.
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
            © {new Date().getFullYear()} IT Resource Zone ·{' '}
            <Link href="/privacy" className="hover:text-theme-accent transition-colors">Privacy Policy</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
