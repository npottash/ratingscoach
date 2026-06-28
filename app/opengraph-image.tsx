import { ImageResponse } from 'next/og'

export const alt = 'The Ratings Coach — Ace your rating agency meetings'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function loadGoogleFont(family: string, weight: number) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family
  )}:wght@${weight}&display=swap`
  const css = await fetch(cssUrl, {
    // Send a desktop UA so Google returns a TTF instead of WOFF2.
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Chrome/121.0',
    },
  }).then((r) => r.text())
  const match = css.match(/src:\s*url\((https?:\/\/[^)]+)\)\s*format/)
  if (!match) {
    throw new Error(`Could not extract font URL for ${family}`)
  }
  return fetch(match[1]).then((r) => r.arrayBuffer())
}

export default async function Image() {
  // EB Garamond is a close, open-licensed analogue of Georgia.
  const garamond500 = await loadGoogleFont('EB Garamond', 500)

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
            fontFamily: 'EB Garamond',
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
    {
      ...size,
      fonts: [
        {
          name: 'EB Garamond',
          data: garamond500,
          weight: 500,
          style: 'normal',
        },
      ],
    }
  )
}
