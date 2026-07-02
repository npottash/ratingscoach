'use client'

/**
 * Vimeo responsive embed. Drop in a Vimeo video ID and it renders a 16:9
 * iframe that fills its parent.
 *
 * Get the ID from the Vimeo URL (e.g. https://vimeo.com/123456789 → "123456789").
 * For private/unlisted videos, you may also need the "h" hash from the share
 * URL — pass it via `hash`.
 */
export function VimeoEmbed({
  videoId,
  hash,
  title = 'The Ratings Coach demo',
}: {
  videoId: string
  hash?: string
  title?: string
}) {
  const params = new URLSearchParams({
    title: '0',
    byline: '0',
    portrait: '0',
    badge: '0',
    autopause: '0',
    dnt: '1',
  })
  if (hash) params.set('h', hash)

  const src = `https://player.vimeo.com/video/${videoId}?${params.toString()}`

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black shadow-sm">
      <iframe
        src={src}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    </div>
  )
}
