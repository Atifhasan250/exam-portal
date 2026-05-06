import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #070A14 0%, #0F1524 40%, #1a1f3d 100%)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Decorative gradient circles */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            left: -60,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Main card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 60px',
            borderRadius: 24,
            border: '1px solid rgba(99, 102, 241, 0.2)',
            background: 'rgba(15, 21, 36, 0.8)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Logo placeholder */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              fontSize: 36,
              fontWeight: 800,
              color: 'white',
            }}
          >
            IRZ
          </div>

          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: '#E8EAF6',
              letterSpacing: '-0.02em',
              marginBottom: 12,
              display: 'flex',
            }}
          >
            IT Resource Zone
          </div>

          <div
            style={{
              fontSize: 22,
              color: '#7080A0',
              display: 'flex',
              textAlign: 'center',
              maxWidth: 600,
            }}
          >
            Free Online IT Exams • Practice Tests • Live Rankings
          </div>
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 16,
            color: '#485070',
            display: 'flex',
          }}
        >
          Compete • Learn • Rank Up
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
