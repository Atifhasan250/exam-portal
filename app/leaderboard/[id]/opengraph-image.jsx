import { ImageResponse } from 'next/og'
import { connectDB } from '@/lib/db'
import { isValidObjectId } from '@/lib/routeParams'
import Exam from '@/lib/models/Exam'
import Submission from '@/lib/models/Submission'

export const runtime = 'nodejs'
export const alt = 'IT Resource Zone leaderboard preview'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }) {
  const { id } = await params
  let title = 'Exam Leaderboard'
  let attempts = 0

  if (isValidObjectId(id)) {
    try {
      await connectDB()
      const [exam, count] = await Promise.all([
        Exam.findOne({ _id: id, published: true }, { title: 1 }).lean(),
        Submission.countDocuments({ examId: id, wasLive: true }),
      ])
      if (exam?.title) title = `${exam.title} Leaderboard`
      attempts = count
    } catch {
      // Use fallback content when OG data is unavailable.
    }
  }

  return new ImageResponse(
    (
      <div style={frameStyle}>
        <div style={badgeStyle}>Leaderboard</div>
        <div style={titleStyle}>{title}</div>
        <div style={metaStyle}>{attempts} ranked live submission{attempts === 1 ? '' : 's'}</div>
        <div style={footerStyle}>Compare scores and track top performers on IT Resource Zone</div>
      </div>
    ),
    size,
  )
}

const frameStyle = {
  width: '100%',
  height: '100%',
  background: '#fff9e3',
  color: '#081126',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  padding: '80px',
  fontFamily: 'Inter, Arial, sans-serif',
}

const badgeStyle = {
  alignSelf: 'flex-start',
  background: '#ea7a53',
  color: '#FFFFFF',
  borderRadius: '16px',
  padding: '12px 20px',
  fontSize: 28,
  fontWeight: 800,
  marginBottom: 40,
}

const titleStyle = {
  fontSize: 72,
  fontWeight: 900,
  lineHeight: 1.05,
  maxWidth: 980,
}

const metaStyle = {
  fontSize: 34,
  color: '#ea7a53',
  marginTop: 30,
  fontWeight: 800,
}

const footerStyle = {
  fontSize: 26,
  color: 'rgba(8,17,38,0.62)',
  marginTop: 70,
}
