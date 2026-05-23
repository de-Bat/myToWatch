export type WatchStatus = 'PLAN' | 'WATCHING' | 'DONE'

export interface WatchlistItem {
  id: string
  userId: string
  mediaId: string
  status: WatchStatus
  addedAt: Date
  media?: import('./media').Media
}
