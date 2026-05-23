import TermsContent from './TermsContent'
import { buildPageMetadata } from '@/lib/site'

export const metadata = buildPageMetadata({
  title: 'Terms of Service',
  description:
    'Read the IT Resource Zone Terms of Service, including exam rules, account responsibilities, academic integrity policies, and platform usage limits.',
  path: '/terms',
})

export default function TermsPage() {
  return <TermsContent />
}
