// apps/mobile/src/lib/authStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'

const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
}

export interface AuthState {
  serverUrl: string | null
  accessToken: string | null
  refreshToken: string | null
  userId: string | null
  role: 'ADMIN' | 'VIEWER' | null
  setServerUrl: (url: string) => void
  setTokens: (access: string, refresh: string, userId: string, role: 'ADMIN' | 'VIEWER') => void
  refreshTokens: () => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      serverUrl: null,
      accessToken: null,
      refreshToken: null,
      userId: null,
      role: null,
      setServerUrl: (url) => set({ serverUrl: url.replace(/\/$/, '') }),
      setTokens: (access, refresh, userId, role) =>
        set({ accessToken: access, refreshToken: refresh, userId, role }),
      refreshTokens: async () => {
        const { serverUrl, refreshToken } = get()
        if (!serverUrl || !refreshToken) throw new Error('No refresh token')
        const res = await fetch(`${serverUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
        if (!res.ok) {
          set({ accessToken: null, refreshToken: null })
          throw new Error('Token refresh failed — please log in again')
        }
        const data = (await res.json()) as { accessToken: string }
        set({ accessToken: data.accessToken })
      },
      logout: () =>
        set({ accessToken: null, refreshToken: null, userId: null, role: null }),
    }),
    {
      name: 'mytowatch-auth',
      storage: createJSONStorage(() => secureStorage),
    },
  ),
)
