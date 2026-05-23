import PrivacyContent from './PrivacyContent'
import { buildPageMetadata } from '@/lib/site'

export const metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description:
    'Learn how IT Resource Zone collects, uses, stores, and protects student account data, exam submissions, analytics, and platform activity.',
  path: '/privacy',
})

export default function PrivacyPage() {
  return <PrivacyContent />
}
