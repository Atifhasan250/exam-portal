import TermsContent from './TermsContent'
import { buildPageMetadata } from '@/lib/site'

export const metadata = buildPageMetadata({
  title: 'Terms of Service',
  description:
    'Read the IT Resource Zone Terms of Service for exam rules, account responsibilities, resource usage, notifications, academic integrity, and platform limits.',
  path: '/terms',
})

export default function TermsPage() {
  return <TermsContent />
}
