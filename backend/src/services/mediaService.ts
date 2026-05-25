import { prisma } from '../db/client'
import { config } from '../config'
import type { Media, MediaMetadata, MediaType } from '@mytowatch/shared'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

export async function searchTmdb(query: string, type?: MediaType): Promise<Media[]> {
  const url = type === 'SERIES'
    ? `${TMDB_BASE}/search/tv?query=${encodeURIComponent(query)}&api_key=${config.tmdbApiKey}`
    : `${TMDB_BASE}/search/multi?query=${encodeURIComponent(query)}&api_key=${config.tmdbApiKey}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`)
  const data = (await res.json()) as { results: TmdbResult[] }

  const filtered = data.results
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv' || type != null)
    .slice(0, 20)

  return Promise.all(filtered.map((r) => tmdbResultToMedia(r, type)))
}

export async function getById(id: string) {
  return prisma.media.findUnique({ where: { id } })
}

export async function getMediaByTmdbId(tmdbId: string) {
  return prisma.media.findUnique({ where: { tmdbId } })
}

export async function getProviders(mediaId: string) {
  const links = await prisma.providerLink.findMany({
    where: { mediaId },
    include: { provider: { select: { id: true, name: true } } },
  })
  return links.map((l) => ({
    providerId: l.providerId,
    providerName: l.provider.name,
    deepLinkTemplate: l.deepLinkTemplate,
    availability: l.availability,
  }))
}

export async function upsertFromTmdb(media: Media) {
  return prisma.media.upsert({
    where: { tmdbId: media.tmdbId },
    create: {
      tmdbId: media.tmdbId,
      imdbId: media.imdbId,
      type: media.type,
      title: media.title,
      poster: media.poster,
      metadata: media.metadata as object,
    },
    update: {
      metadata: media.metadata as object,
      poster: media.poster,
    },
  })
}

async function fetchImdbRating(imdbId: string): Promise<number | null> {
  try {
    const res = await fetch(`https://www.imdb.com/title/${imdbId}/`, {
      headers: { 'Accept-Language': 'en-US', 'User-Agent': 'Mozilla/5.0' },
    })
    const html = await res.text()
    const match = html.match(/"ratingValue":"([\d.]+)"/)
    return match ? parseFloat(match[1]) : null
  } catch {
    return null
  }
}

interface TmdbResult {
  id: number
  media_type?: string
  title?: string
  name?: string
  overview: string
  poster_path?: string | null
  vote_average: number
  release_date?: string
  first_air_date?: string
  runtime?: number | null
  number_of_episodes?: number | null
  external_ids?: { imdb_id?: string }
  genres?: { name: string }[]
  credits?: { cast?: { name: string }[] }
}

async function tmdbResultToMedia(r: TmdbResult, explicitType?: MediaType): Promise<Media> {
  const isMovie = explicitType
    ? explicitType === 'MOVIE'
    : r.media_type === 'movie' || (r.media_type == null && !!r.title)
  const type: MediaType = isMovie ? 'MOVIE' : 'SERIES'
  const title = r.title ?? r.name ?? 'Unknown'
  const year = parseInt(((r.release_date ?? r.first_air_date) ?? '0').slice(0, 4), 10) || 0

  const imdbId = r.external_ids?.imdb_id ?? null
  const imdbRating = imdbId ? await fetchImdbRating(imdbId) : null

  const metadata: MediaMetadata = {
    synopsis: r.overview,
    rating: r.vote_average,
    imdbRating,
    genres: r.genres?.map((g) => g.name) ?? [],
    cast: r.credits?.cast?.slice(0, 10).map((c) => c.name) ?? [],
    year,
    runtime: r.runtime ?? null,
    episodeCount: r.number_of_episodes ?? null,
  }

  return {
    id: '',
    tmdbId: String(r.id),
    imdbId,
    type,
    title,
    poster: r.poster_path ? `${TMDB_IMAGE_BASE}${r.poster_path}` : null,
    metadata,
  }
}
