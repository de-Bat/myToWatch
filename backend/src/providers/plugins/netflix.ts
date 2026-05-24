import { register } from '../registry'
import type { MediaProvider, ProviderConfig, ProviderResult, Availability } from '../interface'
import type { EpisodeRef } from '@mytowatch/shared'

interface TmdbExternalIds {
  id: number
  imdb_id?: string
  netflix_id?: string | number
  [key: string]: unknown
}

async function fetchNetflixId(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
): Promise<string | null> {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${apiKey}`,
    )
    if (!res.ok) return null
    const data = (await res.json()) as TmdbExternalIds
    const netflixId = data.netflix_id
    if (netflixId != null) return String(netflixId)
    return null
  } catch {
    return null
  }
}

const netflixPlugin: MediaProvider = {
  key: 'netflix',
  name: 'Netflix',

  configSchema: {
    properties: {},
    required: [],
  },

  async search(_query: string, _config: ProviderConfig): Promise<ProviderResult[]> {
    return []
  },

  async getAvailability(tmdbId: string, _config: ProviderConfig): Promise<Availability> {
    const movieId = await fetchNetflixId(tmdbId, 'movie')
    if (movieId) return { status: 'available', providerMediaId: movieId }

    const tvId = await fetchNetflixId(tmdbId, 'tv')
    if (tvId) return { status: 'available', providerMediaId: tvId }

    return { status: 'unknown', providerMediaId: null }
  },

  async getDeepLink(
    providerMediaId: string,
    _episode: EpisodeRef | null,
    _config: ProviderConfig,
  ): Promise<string> {
    if (!providerMediaId || providerMediaId.startsWith('search:')) {
      const title = providerMediaId.replace(/^search:/, '')
      return `https://www.netflix.com/search?q=${encodeURIComponent(title)}`
    }
    return `intent://www.netflix.com/title/${providerMediaId}#Intent;package=com.netflix.ninja;scheme=https;end`
  },

  async healthCheck(_config: ProviderConfig): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: 'Netflix plugin active (no server to ping)' }
  },
}

register(netflixPlugin)
