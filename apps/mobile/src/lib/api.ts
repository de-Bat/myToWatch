// apps/mobile/src/lib/api.ts
import { useAuthStore } from './authStore'

const TIMEOUT_MS = 15_000

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { serverUrl, accessToken } = useAuthStore.getState()
  if (!serverUrl) throw new Error('Server not configured')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const buildHeaders = (token: string | null): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> ?? {}),
  })

  try {
    const res = await fetch(`${serverUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: buildHeaders(accessToken),
    })

    if (res.status === 401) {
      // Attempt silent token refresh then retry once
      await useAuthStore.getState().refreshTokens()
      const newToken = useAuthStore.getState().accessToken
      const retry = await fetch(`${serverUrl}${path}`, {
        ...init,
        headers: buildHeaders(newToken),
      })
      if (!retry.ok) throw new Error(`${retry.status}`)
      if (retry.status === 204) return undefined as T
      return retry.json() as Promise<T>
    }

    if (!res.ok) throw new Error(`${res.status}`)
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  } finally {
    clearTimeout(timer)
  }
}

export const apiRequest = request

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
