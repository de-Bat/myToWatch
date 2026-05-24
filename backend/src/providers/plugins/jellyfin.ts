import { register } from '../store'
import type { MediaProvider, ProviderConfig, ProviderResult, Availability } from '../interface'
import type { EpisodeRef } from '@mytowatch/shared'

interface JellyfinItem {
  Id: string
  Name: string
  Type: 'Movie' | 'Series' | string
  ProviderIds?: {
    Tmdb?: string
    Imdb?: string
    [key: string]: string | undefined
  }
}

interface JellyfinItemsResponse {
  Items: JellyfinItem[]
  TotalRecordCount: number
}

interface JellyfinUserDataResponse {
  UserData?: {
    PlaybackPositionTicks: number
    Played: boolean
    LastPlayedDate?: string
  }
}

function headers(apiKey: string): Record<string, string> {
  return {
    'X-Emby-Token': apiKey,
    'Content-Type': 'application/json',
  }
}

async function jellyfinFetch<T>(url: string, apiKey: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { ...headers(apiKey), ...(options?.headers ?? {}) },
  })
  if (!res.ok) {
    throw new Error(`Jellyfin request failed: ${res.status} ${res.statusText} — ${url}`)
  }
  return res.json() as Promise<T>
}

const jellyfinPlugin: MediaProvider = {
  key: 'jellyfin',
  name: 'Jellyfin',

  configSchema: {
    properties: {
      serverUrl: {
        type: 'string',
        description: 'Full URL to your Jellyfin server (e.g. http://192.168.1.10:8096)',
      },
      apiKey: {
        type: 'string',
        description: 'Jellyfin API key (Dashboard → API Keys)',
        secret: true,
      },
      jellyfinUserId: {
        type: 'string',
        description: 'Your Jellyfin user ID (visible in Dashboard → Users → click user)',
      },
    },
    required: ['serverUrl', 'apiKey', 'jellyfinUserId'],
  },

  async search(query: string, config: ProviderConfig): Promise<ProviderResult[]> {
    const url =
      `${config.serverUrl}/Items` +
      `?searchTerm=${encodeURIComponent(query)}` +
      `&IncludeItemTypes=Movie,Series` +
      `&Recursive=true` +
      `&Fields=ProviderIds` +
      `&Limit=20`

    const data = await jellyfinFetch<JellyfinItemsResponse>(url, config.apiKey)

    return data.Items.map((item) => ({
      providerMediaId: item.Id,
      title: item.Name,
      type: item.Type === 'Movie' ? 'MOVIE' : 'SERIES',
      tmdbId: item.ProviderIds?.Tmdb ?? null,
      imdbId: item.ProviderIds?.Imdb ?? null,
    }))
  },

  async getAvailability(tmdbId: string, config: ProviderConfig): Promise<Availability> {
    const url =
      `${config.serverUrl}/Items` +
      `?searchTerm=${encodeURIComponent(tmdbId)}` +
      `&IncludeItemTypes=Movie,Series` +
      `&Recursive=true` +
      `&Fields=ProviderIds`

    const data = await jellyfinFetch<JellyfinItemsResponse>(url, config.apiKey)

    const match = data.Items.find((item) => item.ProviderIds?.Tmdb === tmdbId)
    if (match) {
      return { status: 'available', providerMediaId: match.Id }
    }
    return { status: 'unavailable', providerMediaId: null }
  },

  async getDeepLink(
    providerMediaId: string,
    _episode: EpisodeRef | null,
    _config: ProviderConfig,
  ): Promise<string> {
    return `intent://jellyfin.app/play/${providerMediaId}#Intent;scheme=jellyfin;package=org.jellyfin.androidtv;end`
  },

  async getProgress(
    providerMediaId: string,
    config: ProviderConfig,
  ): Promise<{ positionSec: number; seasonEp: string | null } | null> {
    const url =
      `${config.serverUrl}/Users/${config.jellyfinUserId}/Items/${providerMediaId}` +
      `?Fields=UserData`

    const data = await jellyfinFetch<JellyfinUserDataResponse>(url, config.apiKey)

    if (!data.UserData) return null

    const positionSec = Math.floor(data.UserData.PlaybackPositionTicks / 10_000_000)
    return { positionSec, seasonEp: null }
  },

  async pushProgress(
    providerMediaId: string,
    progress: { positionSec: number; seasonEp: string | null },
    config: ProviderConfig,
  ): Promise<void> {
    if (progress.positionSec > 0) {
      const url = `${config.serverUrl}/Users/${config.jellyfinUserId}/PlayedItems/${providerMediaId}`
      await jellyfinFetch<unknown>(url, config.apiKey, { method: 'POST' })
    }
  },

  async healthCheck(config: ProviderConfig): Promise<{ ok: boolean; message: string }> {
    try {
      await jellyfinFetch<unknown>(`${config.serverUrl}/System/Info`, config.apiKey)
      return { ok: true, message: 'Jellyfin server reachable' }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, message }
    }
  },
}

register(jellyfinPlugin)
