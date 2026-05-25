// apps/mobile/src/lib/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type { WatchlistItem, Media, WatchStatus } from '@mytowatch/shared'

// ---- Types ----

export interface ProviderAvailability {
  providerId: string
  providerName: string
  pluginKey: string
  availability: { status: 'available' | 'unavailable' | 'unknown'; providerMediaId: string | null }
  deepLink: string | null
}

export interface Progress {
  id: string
  mediaId: string
  positionSec: number
  seasonEp: string | null
  updatedAt: string
}

export interface ProviderRow {
  id: string
  name: string
  pluginKey: string
  enabled: boolean
}

export interface UserRow {
  id: string
  email: string
  role: 'ADMIN' | 'VIEWER'
  createdAt: string
}

// ---- Keys ----

export const keys = {
  watchlist: ['watchlist'] as const,
  media: (id: string) => ['media', id] as const,
  mediaProviders: (id: string) => ['media', id, 'providers'] as const,
  progress: (mediaId: string) => ['progress', mediaId] as const,
  search: (q: string) => ['search', q] as const,
  providers: ['providers'] as const,
  users: ['users'] as const,
}

// ---- Watchlist ----

export function useWatchlist() {
  return useQuery({
    queryKey: keys.watchlist,
    queryFn: () => api.get<WatchlistItem[]>('/watchlist'),
  })
}

export function useAddToWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { tmdbId: string; type: string; title: string }) =>
      api.post<WatchlistItem>('/watchlist', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.watchlist }),
  })
}

export function useUpdateWatchlistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WatchStatus }) =>
      api.patch(`/watchlist/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.watchlist }),
  })
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/watchlist/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.watchlist }),
  })
}

// ---- Media ----

export function useMedia(id: string) {
  return useQuery({
    queryKey: keys.media(id),
    queryFn: () => api.get<Media>(`/media/${id}`),
    enabled: !!id,
  })
}

export function useMediaProviders(id: string) {
  return useQuery({
    queryKey: keys.mediaProviders(id),
    queryFn: () => api.get<ProviderAvailability[]>(`/media/${id}/providers`),
    enabled: !!id,
  })
}

export function useSearch(q: string) {
  return useQuery({
    queryKey: keys.search(q),
    queryFn: () => api.get<Media[]>(`/media/search?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
  })
}

// ---- Progress ----

export function useProgress(mediaId: string) {
  return useQuery({
    queryKey: keys.progress(mediaId),
    queryFn: () => api.get<Progress | null>(`/progress/${mediaId}`),
    enabled: !!mediaId,
  })
}

export function useUpsertProgress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ mediaId, positionSec, seasonEp }: { mediaId: string; positionSec: number; seasonEp?: string | null }) =>
      api.patch(`/progress/${mediaId}`, { positionSec, seasonEp }),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: keys.progress(vars.mediaId) }),
  })
}

export function useSyncProgress() {
  return useMutation({
    mutationFn: () => api.post<{ synced: number }>('/progress/sync'),
  })
}

// ---- Providers (admin) ----

export function useProviders() {
  return useQuery({
    queryKey: keys.providers,
    queryFn: () => api.get<ProviderRow[]>('/providers'),
  })
}

export function useCreateProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; pluginKey: string; config: Record<string, string> }) =>
      api.post<ProviderRow>('/providers', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.providers }),
  })
}

export function useUpdateProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; enabled?: boolean; name?: string; config?: Record<string, string>; action?: 'test' }) =>
      api.patch<ProviderRow | { ok: boolean; message: string }>(`/providers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.providers }),
  })
}

export function useDeleteProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/providers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.providers }),
  })
}

// ---- Users (admin) ----

export function useUsers() {
  return useQuery({
    queryKey: keys.users,
    queryFn: () => api.get<UserRow[]>('/users'),
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'ADMIN' | 'VIEWER' }) =>
      api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.users }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.users }),
  })
}
