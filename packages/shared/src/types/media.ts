export type MediaType = 'MOVIE' | 'SERIES'

export interface EpisodeRef {
  season: number
  episode: number
}

export interface MediaMetadata {
  synopsis: string
  rating: number
  imdbRating: number | null
  genres: string[]
  cast: string[]
  year: number
  runtime: number | null
  episodeCount: number | null
}

export interface Media {
  id: string
  tmdbId: string
  imdbId: string | null
  type: MediaType
  title: string
  poster: string | null
  metadata: MediaMetadata
}

export interface ProviderAvailability {
  providerId: string
  providerName: string
  deepLinkTemplate: string
}
