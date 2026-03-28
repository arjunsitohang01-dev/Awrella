const SUPPORTED_SPOTIFY_TYPES = ['track', 'playlist'] as const

export type SpotifyMusicType = (typeof SUPPORTED_SPOTIFY_TYPES)[number]

type SpotifyResource = {
  embedUrl: string
  id: string
  type: SpotifyMusicType
}

function isSpotifyMusicType(value: string): value is SpotifyMusicType {
  return (SUPPORTED_SPOTIFY_TYPES as readonly string[]).includes(value)
}

function isLikelySpotifyId(value: string) {
  return /^[A-Za-z0-9]{10,}$/.test(value)
}

export function normalizeSpotifyMusicType(value?: string | null): SpotifyMusicType | null {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase()
  return isSpotifyMusicType(normalized) ? normalized : null
}

export function parseSpotifyResource(input: string, fallbackType?: string | null): SpotifyResource | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('spotify:')) {
    const parts = trimmed.split(':').filter(Boolean)
    const maybeType = normalizeSpotifyMusicType(parts[1])
    const id = parts[2]?.trim()

    if (maybeType && id && isLikelySpotifyId(id)) {
      return {
        embedUrl: `https://open.spotify.com/embed/${maybeType}/${id}`,
        id,
        type: maybeType,
      }
    }
  }

  try {
    const url = new URL(trimmed)
    const hostname = url.hostname.toLowerCase()

    if (hostname.endsWith('spotify.com')) {
      const rawSegments = url.pathname.split('/').filter(Boolean)
      const segments = rawSegments[0]?.startsWith('intl-') ? rawSegments.slice(1) : rawSegments
      const normalizedSegments = segments[0] === 'embed' ? segments.slice(1) : segments
      const maybeType = normalizeSpotifyMusicType(normalizedSegments[0])
      const id = normalizedSegments[1]?.trim()

      if (maybeType && id && isLikelySpotifyId(id)) {
        return {
          embedUrl: `https://open.spotify.com/embed/${maybeType}/${id}`,
          id,
          type: maybeType,
        }
      }
    }
  } catch {
    const normalizedFallbackType = normalizeSpotifyMusicType(fallbackType)

    if (normalizedFallbackType && isLikelySpotifyId(trimmed)) {
      return {
        embedUrl: `https://open.spotify.com/embed/${normalizedFallbackType}/${trimmed}`,
        id: trimmed,
        type: normalizedFallbackType,
      }
    }
  }

  return null
}

export function toSpotifyEmbedUrl(input: string, fallbackType?: string | null) {
  return parseSpotifyResource(input, fallbackType)?.embedUrl || input.trim()
}
