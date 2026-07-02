import { ImageResponse } from 'next/og'

export const alt = 'The Ratings Coach — Ace your rating agency meetings'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#f8f9fc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 110,
            fontWeight: 500,
            color: '#1a2744',
            letterSpacing: '-0.01em',
          }}
        >
          The Ratings Coach
        </div>
        <div
          style={{
            fontSize: 28,
            marginTop: 36,
            color: '#378ADD',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
          }}
        >
          Ace your rating agency meetings
        </div>
      </div>
    ),
    size
  )
}
