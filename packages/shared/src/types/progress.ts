import type { EpisodeRef } from './media'

export interface Progress {
  id: string
  userId: string
  mediaId: string
  seasonEp: string | null
  positionSec: number
  updatedAt: Date
}

export function formatEpisodeRef(ref: EpisodeRef): string {
  return `S${String(ref.season).padStart(2, '0')}E${String(ref.episode).padStart(2, '0')}`
}

export function parseEpisodeRef(s: string): EpisodeRef | null {
  const m = s.match(/^S(\d+)E(\d+)$/)
  if (!m) return null
  return { season: parseInt(m[1], 10), episode: parseInt(m[2], 10) }
}
