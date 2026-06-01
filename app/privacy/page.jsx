import PrivacyContent from './PrivacyContent'
import { buildPageMetadata } from '@/lib/site'

export const metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description:
    'Learn how IT Resource Zone handles student accounts, exam submissions, planner and habit data, resource progress, notifications, analytics, and platform activity.',
  path: '/privacy',
})

export default function PrivacyPage() {
  return <PrivacyContent />
}
