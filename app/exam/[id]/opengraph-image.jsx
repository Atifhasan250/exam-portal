import { ImageResponse } from 'next/og'
import { isValidObjectId } from '@/lib/routeParams'
import { getCachedPublicExamDetail, publicExamSummary } from '@/lib/publicCache'

export const runtime = 'nodejs'
export const alt = 'IT Resource Zone exam preview'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }) {
  const { id } = await params
  const exam = isValidObjectId(id)
    ? publicExamSummary(await getCachedPublicExamDetail(id).catch(() => null))
    : null

  return new ImageResponse(
    (
      <div style={frameStyle}>
        <div style={badgeStyle}>IT Resource Zone</div>
        <div style={titleStyle}>{exam?.title || 'IT Exam'}</div>
        <div style={metaStyle}>
          {(exam?.questionCount || 0)} questions | {(exam?.duration || 0)} minutes | Live and practice scoring
        </div>
        <div style={footerStyle}>Beginner IT exams, rankings, and focused practice</div>
      </div>
    ),
    size,
  )
}

const frameStyle = {
  width: '100%',
  height: '100%',
  background: '#070A14',
  color: '#E8EAF6',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  padding: '80px',
  fontFamily: 'Inter, Arial, sans-serif',
}

const badgeStyle = {
  alignSelf: 'flex-start',
  background: '#6366F1',
  color: '#FFFFFF',
  borderRadius: '16px',
  padding: '12px 20px',
  fontSize: 28,
  fontWeight: 800,
  marginBottom: 40,
}

const titleStyle = {
  fontSize: 76,
  fontWeight: 900,
  lineHeight: 1.05,
  maxWidth: 950,
}

const metaStyle = {
  fontSize: 32,
  color: '#A5B4FC',
  marginTop: 30,
}

const footerStyle = {
  fontSize: 26,
  color: '#7080A0',
  marginTop: 70,
}
