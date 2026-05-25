# myToWatch — Plan 3: Expo Mobile App (Android TV + iOS)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the cross-platform Expo SDK 52 app in `apps/mobile/` targeting Android TV and iOS, with screens for Home/Dashboard, Search, MediaDetail, Settings (admin), and Profile — connecting to the self-hosted backend built in Plans 1 & 2.

**Architecture:** Expo SDK 52 + expo-router v4 (file-based routing). Auth state in Zustand persisted via expo-secure-store. Server state via TanStack Query v5. Platform.isTV drives layout branching: TV gets a side nav + D-pad-friendly full-screen layout; iOS gets bottom tabs + touch-optimized layout. No Tailwind — React Native StyleSheet only (TV compatibility). Deep-link playback via `Linking.openURL`.

**Tech Stack:** Expo SDK 52, expo-router v4, React Native 0.76, TanStack Query v5, Zustand v5, expo-secure-store, jest-expo, @testing-library/react-native, TypeScript 5, @mytowatch/shared (local workspace).

---

## Background — what Plans 1 & 2 provide

| Backend endpoint | Used by |
|---|---|
| `POST /auth/register` | Onboarding (first-run creates ADMIN) |
| `POST /auth/login` | Login screen |
| `POST /auth/refresh` | Token auto-refresh in API client |
| `GET /watchlist` | Home screen |
| `POST /watchlist` | MediaDetail — Add to Watchlist |
| `PATCH /watchlist/:id` | MediaDetail — change status |
| `GET /media/search?q=` | Search screen |
| `GET /media/:id` | MediaDetail — metadata |
| `GET /media/:id/providers` | MediaDetail — live availability + deep-links |
| `GET /progress/:mediaId` | MediaDetail — progress bar |
| `PUT /progress/:mediaId` | MediaDetail — save position |
| `POST /progress/sync` | Profile — manual sync |
| `GET /providers` | Settings — list |
| `POST /providers` | Settings — add |
| `PATCH /providers/:id` | Settings — enable/disable + test |
| `DELETE /providers/:id` | Settings — remove |
| `GET /users` | Settings — user list |
| `PATCH /users/:id/role` | Settings — change role |
| `DELETE /users/:id` | Settings — remove user |

---

## File Map

**New workspace app:** `apps/mobile/`

```
apps/mobile/
  app.json                         ← Expo config (bundle ID, TV intent filter)
  app.config.ts                    ← dynamic config (reads env)
  package.json
  tsconfig.json
  jest.config.js
  babel.config.js
  app/
    _layout.tsx                    ← Root: QueryClient + auth gate (redirects to /onboarding or /login)
    onboarding.tsx                 ← Server URL entry + connection test
    login.tsx                      ← Login / Register form
    (app)/
      _layout.tsx                  ← Authenticated shell: TV side nav OR iOS bottom tabs
      index.tsx                    ← Home/Dashboard
      search.tsx                   ← Search screen
      profile.tsx                  ← Profile screen
      media/
        [id].tsx                   ← MediaDetail (poster, providers, Play, Add)
      settings/
        _layout.tsx                ← Settings stack (admin guard)
        index.tsx                  ← Settings home
        providers.tsx              ← Providers CRUD + test
        providers-form.tsx         ← Add/edit provider form
        users.tsx                  ← User list + role management
  src/
    lib/
      api.ts                       ← Typed fetch wrapper (auto-refresh on 401)
      authStore.ts                 ← Zustand store: serverUrl, tokens, role
      queries.ts                   ← TanStack Query hooks (useWatchlist, useSearch, …)
    design/
      tokens.ts                    ← Colors, spacing, typography, TV constants
    components/
      FocusableItem.tsx            ← TV-aware Pressable with focus ring
      PosterCard.tsx               ← Media poster + title card
      ProgressBar.tsx              ← Thin progress indicator
      RowSection.tsx               ← Horizontal scroll row with heading
      TVSideNav.tsx                ← D-pad-navigable side navigation for TV
      ProviderChip.tsx             ← Badge showing provider + availability status
  __tests__/
    api.test.ts                    ← API client unit tests (fetch mocked)
    authStore.test.ts              ← Auth store unit tests
```

---

## Task 1: Expo App Bootstrap

**Files:**
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/jest.config.js`
- Create: `apps/mobile/app/_layout.tsx` (stub)

**Prerequisites:** pnpm@9, Node 20. The workspace `pnpm-workspace.yaml` already includes `apps/*`.

- [ ] **Step 1: Create apps/mobile directory and package.json**

```bash
mkdir -p apps/mobile/app apps/mobile/src/lib apps/mobile/src/design apps/mobile/src/components apps/mobile/__tests__ apps/mobile/assets
```

Create `apps/mobile/package.json`:

```json
{
  "name": "@mytowatch/mobile",
  "version": "0.0.1",
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "build:android": "expo export --platform android",
    "build:ios": "expo export --platform ios",
    "test": "jest --watchAll=false",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@mytowatch/shared": "workspace:*",
    "@tanstack/react-query": "^5.28.0",
    "expo": "~52.0.0",
    "expo-constants": "~17.0.0",
    "expo-linking": "~7.0.0",
    "expo-router": "~4.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-splash-screen": "~0.29.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.1",
    "react-native": "0.76.3",
    "react-native-safe-area-context": "4.14.0",
    "react-native-screens": "~4.4.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@testing-library/react-native": "^12.4.0",
    "@types/react": "~18.3.0",
    "jest": "^29.7.0",
    "jest-expo": "~52.0.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create app.json**

```json
{
  "expo": {
    "name": "myToWatch",
    "slug": "mytowatch",
    "version": "1.0.0",
    "orientation": "landscape",
    "icon": "./assets/icon.png",
    "scheme": "mytowatch",
    "userInterfaceStyle": "dark",
    "splash": {
      "backgroundColor": "#0D0D1A"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.mytowatch.app"
    },
    "android": {
      "package": "com.mytowatch.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0D0D1A"
      },
      "intentFilters": [
        {
          "action": "android.intent.action.MAIN",
          "category": [
            "android.intent.category.LAUNCHER",
            "android.intent.category.LEANBACK_LAUNCHER"
          ]
        }
      ]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

The `LEANBACK_LAUNCHER` category makes the app appear in the Android TV launcher.

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@mytowatch/shared": ["../../packages/shared/src/index.ts"]
    }
  }
}
```

- [ ] **Step 4: Create babel.config.js**

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
  }
}
```

- [ ] **Step 5: Create jest.config.js**

```js
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '@mytowatch/shared': '<rootDir>/../../packages/shared/src/index.ts',
  },
  setupFilesAfterFramework: ['@testing-library/react-native/extend-expect'],
}
```

- [ ] **Step 6: Create stub root layout app/_layout.tsx**

```tsx
// apps/mobile/app/_layout.tsx
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
```

- [ ] **Step 7: Create placeholder home screen app/(app)/index.tsx**

```tsx
// apps/mobile/app/(app)/index.tsx
import { View, Text } from 'react-native'

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D1A', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff' }}>myToWatch</Text>
    </View>
  )
}
```

- [ ] **Step 8: Create placeholder assets**

Create `apps/mobile/assets/icon.png` and `apps/mobile/assets/adaptive-icon.png` — use any 1024×1024 PNG placeholder (copy from an existing asset or create a solid dark square). These are required by Expo to start.

```bash
# From the project root in WSL or PowerShell with ImageMagick:
# If no ImageMagick, just copy any existing PNG:
cp backend/src/../../../docs/screen.png apps/mobile/assets/icon.png 2>/dev/null || true
cp apps/mobile/assets/icon.png apps/mobile/assets/adaptive-icon.png 2>/dev/null || true
# If the above fails, create a 1x1 white PNG manually — Expo only checks the file exists at build time
```

Alternatively, run `npx expo customize` to generate default assets.

- [ ] **Step 9: Install dependencies**

```bash
cd apps/mobile && pnpm install
```

Expected: packages install successfully. If peer dependency warnings appear about React Native version mismatches, they are safe to ignore for dev.

- [ ] **Step 10: Verify TypeScript compiles**

```bash
cd apps/mobile && pnpm lint
```

Expected: no errors (only the two stub files, both type-correct).

- [ ] **Step 11: Add mobile to turbo.json**

Open `turbo.json` at the repo root and confirm the existing tasks cover `dev`, `build`, `test`, `lint` — these already apply to all workspaces. No changes needed.

- [ ] **Step 12: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): bootstrap Expo SDK 52 app with Android TV LEANBACK_LAUNCHER config"
```

---

## Task 2: API Client + Auth Store

**Files:**
- Create: `apps/mobile/src/lib/api.ts`
- Create: `apps/mobile/src/lib/authStore.ts`
- Create: `apps/mobile/__tests__/api.test.ts`
- Create: `apps/mobile/__tests__/authStore.test.ts`

- [ ] **Step 1: Write failing API client tests**

Create `apps/mobile/__tests__/api.test.ts`:

```typescript
// apps/mobile/__tests__/api.test.ts
import { api, apiRequest } from '../src/lib/api'
import { useAuthStore } from '../src/lib/authStore'

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

function makeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

beforeEach(() => {
  mockFetch.mockReset()
  useAuthStore.setState({
    serverUrl: 'http://localhost:3000',
    accessToken: 'tok-abc',
    refreshToken: 'ref-xyz',
    userId: 'u1',
    role: 'ADMIN',
  })
})

describe('api.get', () => {
  it('calls correct URL with Authorization header', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ items: [] }))
    const result = await api.get<{ items: unknown[] }>('/watchlist')
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/watchlist',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok-abc' }),
      }),
    )
    expect(result).toEqual({ items: [] })
  })

  it('throws when serverUrl is not set', async () => {
    useAuthStore.setState({ serverUrl: null })
    await expect(api.get('/watchlist')).rejects.toThrow('Server not configured')
  })

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ error: 'Not Found' }, 404))
    await expect(api.get('/missing')).rejects.toThrow('404')
  })

  it('auto-refreshes token on 401 and retries', async () => {
    // First call → 401
    mockFetch.mockResolvedValueOnce(makeResponse({ error: 'Unauthorized' }, 401))
    // Refresh call → new token
    mockFetch.mockResolvedValueOnce(makeResponse({ accessToken: 'tok-new' }))
    // Retry → success
    mockFetch.mockResolvedValueOnce(makeResponse({ items: ['x'] }))

    const result = await api.get<{ items: string[] }>('/watchlist')
    expect(result).toEqual({ items: ['x'] })
    expect(mockFetch).toHaveBeenCalledTimes(3)
    // New token stored
    expect(useAuthStore.getState().accessToken).toBe('tok-new')
  })
})

describe('api.post', () => {
  it('sends JSON body with POST method', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ id: '1' }, 201))
    await api.post('/watchlist', { tmdbId: '603' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ tmdbId: '603' }),
      }),
    )
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd apps/mobile && pnpm test __tests__/api.test.ts
```

Expected: FAIL — `Cannot find module '../src/lib/api'`

- [ ] **Step 3: Create apps/mobile/src/lib/authStore.ts**

(Must exist before api.ts since api.ts imports it.)

```typescript
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
```

- [ ] **Step 4: Create apps/mobile/src/lib/api.ts**

```typescript
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
```

- [ ] **Step 5: Run API tests — expect PASS**

```bash
cd apps/mobile && pnpm test __tests__/api.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 6: Write auth store tests**

Create `apps/mobile/__tests__/authStore.test.ts`:

```typescript
// apps/mobile/__tests__/authStore.test.ts
import { useAuthStore } from '../src/lib/authStore'

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  useAuthStore.setState({
    serverUrl: 'http://host:3000',
    accessToken: 'old-token',
    refreshToken: 'ref-token',
    userId: 'u1',
    role: 'VIEWER',
  })
})

describe('useAuthStore', () => {
  it('setServerUrl strips trailing slash', () => {
    useAuthStore.getState().setServerUrl('http://host:3000/')
    expect(useAuthStore.getState().serverUrl).toBe('http://host:3000')
  })

  it('setTokens stores all auth fields', () => {
    useAuthStore.getState().setTokens('a', 'r', 'u2', 'ADMIN')
    const s = useAuthStore.getState()
    expect(s.accessToken).toBe('a')
    expect(s.refreshToken).toBe('r')
    expect(s.userId).toBe('u2')
    expect(s.role).toBe('ADMIN')
  })

  it('logout clears tokens but keeps serverUrl', () => {
    useAuthStore.getState().logout()
    const s = useAuthStore.getState()
    expect(s.accessToken).toBeNull()
    expect(s.refreshToken).toBeNull()
    expect(s.userId).toBeNull()
    expect(s.serverUrl).toBe('http://host:3000')
  })

  it('refreshTokens stores new accessToken', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'new-tok' }),
    })
    await useAuthStore.getState().refreshTokens()
    expect(useAuthStore.getState().accessToken).toBe('new-tok')
  })

  it('refreshTokens clears tokens on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
    await expect(useAuthStore.getState().refreshTokens()).rejects.toThrow()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
})
```

- [ ] **Step 7: Run auth store tests — expect PASS**

```bash
cd apps/mobile && pnpm test __tests__/authStore.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/lib apps/mobile/__tests__
git commit -m "feat(mobile): API client with auto-refresh and Zustand auth store"
```

---

## Task 3: Design Tokens + Base Components

**Files:**
- Create: `apps/mobile/src/design/tokens.ts`
- Create: `apps/mobile/src/components/FocusableItem.tsx`
- Create: `apps/mobile/src/components/PosterCard.tsx`
- Create: `apps/mobile/src/components/ProgressBar.tsx`
- Create: `apps/mobile/src/components/RowSection.tsx`
- Create: `apps/mobile/src/components/ProviderChip.tsx`

- [ ] **Step 1: Create design tokens**

```typescript
// apps/mobile/src/design/tokens.ts
import { Platform } from 'react-native'

export const isTV = Platform.isTV

// Colours — Nocturne Cinema design system
export const colors = {
  bg: '#0D0D1A',
  bgCard: 'rgba(255,255,255,0.06)',
  bgCardFocused: 'rgba(139,92,246,0.25)',
  border: 'rgba(255,255,255,0.10)',
  borderFocused: '#8B5CF6',
  accent: '#8B5CF6',       // purple
  accentDim: '#6D28D9',
  text: '#FFFFFF',
  textMuted: '#9CA3AF',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
} as const

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

// TV overscan safe margin — 5% on each side, minimum 48px
export const TV_OVERSCAN = isTV ? 48 : 0

// Side nav width on TV
export const TV_SIDE_NAV_WIDTH = 240

// Typography
export const typography = {
  displayLg: { fontSize: isTV ? 40 : 28, fontWeight: '700' as const, color: colors.text },
  display:   { fontSize: isTV ? 32 : 22, fontWeight: '700' as const, color: colors.text },
  heading:   { fontSize: isTV ? 24 : 18, fontWeight: '600' as const, color: colors.text },
  body:      { fontSize: isTV ? 20 : 16, fontWeight: '400' as const, color: colors.text },
  caption:   { fontSize: isTV ? 16 : 13, fontWeight: '400' as const, color: colors.textMuted },
} as const

// Card sizes
export const cardSize = {
  poster: { width: isTV ? 200 : 120, height: isTV ? 300 : 180 },
} as const
```

- [ ] **Step 2: Create FocusableItem — TV-aware Pressable with focus ring**

```tsx
// apps/mobile/src/components/FocusableItem.tsx
import React, { useState, useCallback } from 'react'
import { Pressable, PressableProps, StyleSheet, ViewStyle } from 'react-native'
import { colors } from '../design/tokens'

interface Props extends PressableProps {
  style?: ViewStyle
  focusedStyle?: ViewStyle
  hasTVPreferredFocus?: boolean
}

export function FocusableItem({ style, focusedStyle, hasTVPreferredFocus, children, ...rest }: Props) {
  const [focused, setFocused] = useState(false)

  const handleFocus = useCallback(() => setFocused(true), [])
  const handleBlur = useCallback(() => setFocused(false), [])

  return (
    <Pressable
      {...rest}
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={[
        styles.base,
        style,
        focused && styles.focused,
        focused && focusedStyle,
      ]}
    >
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  focused: {
    borderColor: colors.borderFocused,
    backgroundColor: colors.bgCardFocused,
  },
})
```

- [ ] **Step 3: Create PosterCard — media poster card**

```tsx
// apps/mobile/src/components/PosterCard.tsx
import React from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { FocusableItem } from './FocusableItem'
import { colors, typography, cardSize, spacing } from '../design/tokens'
import type { Media } from '@mytowatch/shared'

interface Props {
  media: Pick<Media, 'id' | 'title' | 'poster' | 'type'>
  onPress: () => void
  hasTVPreferredFocus?: boolean
  progress?: number // 0–1
}

export function PosterCard({ media, onPress, hasTVPreferredFocus, progress }: Props) {
  return (
    <FocusableItem
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={styles.card}
    >
      {media.poster ? (
        <Image
          source={{ uri: media.poster }}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <Text style={typography.caption}>{media.type}</Text>
        </View>
      )}
      {progress !== undefined && progress > 0 && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      )}
      <Text style={[typography.caption, styles.title]} numberOfLines={2}>
        {media.title}
      </Text>
    </FocusableItem>
  )
}

const styles = StyleSheet.create({
  card: {
    width: cardSize.poster.width,
    marginRight: spacing.sm,
  },
  poster: {
    width: cardSize.poster.width,
    height: cardSize.poster.height,
    borderRadius: 6,
    backgroundColor: colors.bgCard,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.border,
    marginTop: 2,
    borderRadius: 2,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  title: {
    marginTop: spacing.xs,
  },
})
```

- [ ] **Step 4: Create ProgressBar**

```tsx
// apps/mobile/src/components/ProgressBar.tsx
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { colors } from '../design/tokens'

interface Props {
  progress: number // 0–1
  height?: number
}

export function ProgressBar({ progress, height = 4 }: Props) {
  const clamped = Math.max(0, Math.min(1, progress))
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
})
```

- [ ] **Step 5: Create RowSection — horizontal scroll row with heading**

```tsx
// apps/mobile/src/components/RowSection.tsx
import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { typography, spacing } from '../design/tokens'

interface Props {
  title: string
  children: React.ReactNode
}

export function RowSection({ title, children }: Props) {
  return (
    <View style={styles.section}>
      <Text style={[typography.heading, styles.heading]}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {children}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  heading: {
    marginBottom: spacing.md,
  },
  row: {
    paddingBottom: spacing.sm,
  },
})
```

- [ ] **Step 6: Create ProviderChip — badge showing provider + status**

```tsx
// apps/mobile/src/components/ProviderChip.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { colors, typography, spacing } from '../design/tokens'

interface Props {
  providerName: string
  status: 'available' | 'unavailable' | 'unknown'
  deepLink: string | null
  onPlay?: () => void
}

export function ProviderChip({ providerName, status, deepLink, onPlay }: Props) {
  const statusColor = status === 'available' ? colors.success : status === 'unavailable' ? colors.error : colors.textMuted
  const canPlay = status === 'available' && deepLink && onPlay

  return (
    <View style={styles.chip}>
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <Text style={[typography.caption, styles.name]}>{providerName}</Text>
      {canPlay && (
        <TouchableOpacity onPress={onPlay} style={styles.playBtn}>
          <Text style={[typography.caption, styles.playText]}>▶ Play</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  name: {
    marginRight: spacing.sm,
  },
  playBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  playText: {
    color: colors.text,
    fontWeight: '600',
  },
})
```

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src
git commit -m "feat(mobile): design tokens and base components (FocusableItem, PosterCard, ProgressBar, ProviderChip)"
```

---

## Task 4: TanStack Query Hooks

**Files:**
- Create: `apps/mobile/src/lib/queries.ts`

All API data fetching goes through these hooks. One file keeps all query keys in one place, preventing stale-key bugs.

- [ ] **Step 1: Create queries.ts**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/lib/queries.ts
git commit -m "feat(mobile): TanStack Query hooks for all API endpoints"
```

---

## Task 5: Navigation Skeleton + Auth Gate + Onboarding

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/onboarding.tsx`
- Create: `apps/mobile/app/login.tsx`
- Create: `apps/mobile/app/(app)/_layout.tsx`
- Create: `apps/mobile/src/components/TVSideNav.tsx`

- [ ] **Step 1: Create TVSideNav component**

```tsx
// apps/mobile/src/components/TVSideNav.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { FocusableItem } from './FocusableItem'
import { colors, typography, spacing, TV_OVERSCAN, TV_SIDE_NAV_WIDTH } from '../design/tokens'
import { useAuthStore } from '../lib/authStore'

const NAV_ITEMS = [
  { label: 'Home',     href: '/(app)/' as const,          icon: '⌂' },
  { label: 'Search',   href: '/(app)/search' as const,    icon: '⌕' },
  { label: 'Profile',  href: '/(app)/profile' as const,   icon: '◉' },
  { label: 'Settings', href: '/(app)/settings/' as const, icon: '⚙', adminOnly: true },
]

export function TVSideNav() {
  const router = useRouter()
  const pathname = usePathname()
  const role = useAuthStore((s) => s.role)

  const items = NAV_ITEMS.filter((i) => !i.adminOnly || role === 'ADMIN')

  return (
    <View style={styles.nav}>
      <Text style={[typography.heading, styles.brand]}>myToWatch</Text>
      {items.map((item, idx) => {
        const active = pathname === item.href || pathname.startsWith(item.href.replace(/\/$/, ''))
        return (
          <FocusableItem
            key={item.href}
            onPress={() => router.push(item.href)}
            hasTVPreferredFocus={idx === 0}
            style={[styles.item, active && styles.itemActive]}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={[typography.body, active && styles.labelActive]}>{item.label}</Text>
          </FocusableItem>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  nav: {
    width: TV_SIDE_NAV_WIDTH,
    backgroundColor: 'rgba(13,13,26,0.95)',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: TV_OVERSCAN + spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: TV_OVERSCAN,
  },
  brand: {
    color: colors.accent,
    marginBottom: spacing.xxl,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 8,
  },
  itemActive: {
    backgroundColor: colors.bgCardFocused,
  },
  icon: {
    fontSize: 20,
    color: colors.text,
    marginRight: spacing.md,
    width: 28,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.accent,
    fontWeight: '700',
  },
})
```

- [ ] **Step 2: Update root layout with QueryClient + auth gate**

Replace `apps/mobile/app/_layout.tsx`:

```tsx
// apps/mobile/app/_layout.tsx
import React, { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '../src/lib/authStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const segments = useSegments()
  const { serverUrl, accessToken } = useAuthStore()

  useEffect(() => {
    const inApp = segments[0] === '(app)'
    const inAuth = segments[0] === 'login' || segments[0] === 'onboarding'

    if (!serverUrl) {
      if (!inAuth) router.replace('/onboarding')
      return
    }
    if (!accessToken) {
      if (!inAuth) router.replace('/login')
      return
    }
    if (inAuth) {
      router.replace('/(app)/')
    }
  }, [serverUrl, accessToken, segments])

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D0D1A' } }} />
      </AuthGate>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 3: Create onboarding screen**

Create `apps/mobile/app/onboarding.tsx`:

```tsx
// apps/mobile/app/onboarding.tsx
import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../src/lib/authStore'
import { colors, typography, spacing } from '../src/design/tokens'

export default function OnboardingScreen() {
  const router = useRouter()
  const setServerUrl = useAuthStore((s) => s.setServerUrl)
  const [url, setUrl] = useState('http://')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setError(null)
    setLoading(true)
    try {
      const clean = url.replace(/\/$/, '')
      const res = await fetch(`${clean}/auth/register`, { method: 'HEAD' }).catch(() => null)
      // Any response (even 4xx) means server is reachable
      if (!res && !(await fetch(`${clean}/health`).catch(() => null))) {
        throw new Error('Cannot reach server. Check the URL and that the backend is running.')
      }
      setServerUrl(clean)
      router.replace('/login')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={[typography.displayLg, styles.title]}>myToWatch</Text>
        <Text style={[typography.body, styles.subtitle]}>
          Enter your self-hosted backend URL to get started.
        </Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="http://192.168.1.10:3000"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={handleConnect}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleConnect}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.text} />
            : <Text style={[typography.body, styles.btnText]}>Connect</Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    maxWidth: 480,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontWeight: '700',
  },
})
```

- [ ] **Step 4: Create login screen**

Create `apps/mobile/app/login.tsx`:

```tsx
// apps/mobile/app/login.tsx
import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../src/lib/authStore'
import { colors, typography, spacing } from '../src/design/tokens'

export default function LoginScreen() {
  const router = useRouter()
  const { serverUrl, setTokens } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login'
      const res = await fetch(`${serverUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `${res.status}`)
      setTokens(data.accessToken, data.refreshToken, data.user.id, data.user.role)
      router.replace('/(app)/')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={[typography.display, styles.title]}>
          {isRegister ? 'Create Account' : 'Sign In'}
        </Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.text} />
            : <Text style={[typography.body, styles.btnText]}>
                {isRegister ? 'Create Account' : 'Sign In'}
              </Text>
          }
        </Pressable>
        <View style={styles.toggle}>
          <Text style={[typography.caption]}>
            {isRegister ? 'Already have an account?' : 'No account yet?'}
          </Text>
          <Pressable onPress={() => setIsRegister(!isRegister)}>
            <Text style={[typography.caption, styles.toggleLink]}>
              {isRegister ? 'Sign In' : 'Register'}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    maxWidth: 480,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontWeight: '700' },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  toggleLink: {
    color: colors.accent,
    fontWeight: '600',
  },
})
```

- [ ] **Step 5: Create authenticated layout (app)/_layout.tsx**

```tsx
// apps/mobile/app/(app)/_layout.tsx
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Tabs, Stack } from 'expo-router'
import { Platform } from 'react-native'
import { TVSideNav } from '../../src/components/TVSideNav'
import { colors, TV_OVERSCAN } from '../../src/design/tokens'

// TV uses a custom side nav layout; iOS/Web uses bottom tabs
function TVLayout({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.tv}>
      <TVSideNav />
      <View style={[styles.content, { paddingTop: TV_OVERSCAN, paddingRight: TV_OVERSCAN }]}>
        {children}
      </View>
    </View>
  )
}

export default function AppLayout() {
  if (Platform.isTV) {
    return (
      <TVLayout>
        <Stack screenOptions={{ headerShown: false }} />
      </TVLayout>
    )
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarLabel: 'Search' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="media" options={{ href: null }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tv: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
})
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app apps/mobile/src/components/TVSideNav.tsx
git commit -m "feat(mobile): navigation skeleton — TV side nav, iOS tabs, auth gate, onboarding, login"
```

---

## Task 6: Home/Dashboard Screen

**Files:**
- Modify: `apps/mobile/app/(app)/index.tsx`

The home screen shows three rows: Continue Watching (progress > 0), My Watchlist, and recently added items.

- [ ] **Step 1: Implement Home screen**

Replace `apps/mobile/app/(app)/index.tsx`:

```tsx
// apps/mobile/app/(app)/index.tsx
import React from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useWatchlist } from '../../src/lib/queries'
import { PosterCard } from '../../src/components/PosterCard'
import { RowSection } from '../../src/components/RowSection'
import { colors, typography, spacing, TV_OVERSCAN } from '../../src/design/tokens'
import type { WatchlistItem } from '@mytowatch/shared'

export default function HomeScreen() {
  const router = useRouter()
  const { data: watchlist, isLoading, refetch, isRefetching } = useWatchlist()

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    )
  }

  const items = watchlist ?? []
  const continueWatching = items.filter(
    (w) => w.status === 'WATCHING',
  )
  const planToWatch = items.filter((w) => w.status === 'PLAN')
  const recentlyAdded = [...items].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
  ).slice(0, 20)

  const navigateToMedia = (item: WatchlistItem) =>
    router.push({ pathname: '/(app)/media/[id]', params: { id: item.mediaId } })

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
    >
      <Text style={[typography.displayLg, styles.pageTitle]}>myToWatch</Text>

      {continueWatching.length > 0 && (
        <RowSection title="Continue Watching">
          {continueWatching.map((w, idx) => (
            <PosterCard
              key={w.id}
              media={{ id: w.mediaId, title: w.media?.title ?? '—', poster: w.media?.poster ?? null, type: w.media?.type ?? 'MOVIE' }}
              onPress={() => navigateToMedia(w)}
              hasTVPreferredFocus={idx === 0}
            />
          ))}
        </RowSection>
      )}

      {planToWatch.length > 0 && (
        <RowSection title="Plan to Watch">
          {planToWatch.map((w, idx) => (
            <PosterCard
              key={w.id}
              media={{ id: w.mediaId, title: w.media?.title ?? '—', poster: w.media?.poster ?? null, type: w.media?.type ?? 'MOVIE' }}
              onPress={() => navigateToMedia(w)}
              hasTVPreferredFocus={continueWatching.length === 0 && idx === 0}
            />
          ))}
        </RowSection>
      )}

      {recentlyAdded.length > 0 && (
        <RowSection title="Recently Added">
          {recentlyAdded.slice(0, 10).map((w) => (
            <PosterCard
              key={w.id}
              media={{ id: w.mediaId, title: w.media?.title ?? '—', poster: w.media?.poster ?? null, type: w.media?.type ?? 'MOVIE' }}
              onPress={() => navigateToMedia(w)}
            />
          ))}
        </RowSection>
      )}

      {items.length === 0 && (
        <View style={styles.empty}>
          <Text style={typography.heading}>Your watchlist is empty</Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm }]}>
            Search for movies and TV shows to add them.
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingLeft: spacing.xl + TV_OVERSCAN },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { marginBottom: spacing.xl },
  empty: { marginTop: spacing.xxl, alignItems: 'center' },
})
```

**Note about `w.media`:** The backend `GET /watchlist` returns `WatchlistItem[]`. Check the shared type — if `media` is not included, you will need to update the backend route to `include: { media: { select: { id, title, poster, type } } }` in the Prisma query inside `watchlistService.ts`, or make a separate call per item. Preferred: update the backend to include media inline.

**Backend update (if media not included in WatchlistItem):** Open `backend/src/services/watchlistService.ts`. Find `getUserWatchlist` and add `include: { media: { select: { id: true, title: true, poster: true, type: true } } }` to the findMany call. Commit separately: `git commit -m "feat(watchlist): include media in watchlist response"`.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(app\)/index.tsx
git commit -m "feat(mobile): Home/Dashboard screen with Continue Watching and watchlist rows"
```

---

## Task 7: Search Screen

**Files:**
- Create: `apps/mobile/app/(app)/search.tsx`

- [ ] **Step 1: Implement Search screen**

```tsx
// apps/mobile/app/(app)/search.tsx
import React, { useState, useCallback } from 'react'
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useSearch } from '../../src/lib/queries'
import { PosterCard } from '../../src/components/PosterCard'
import { colors, typography, spacing, TV_OVERSCAN } from '../../src/design/tokens'
import type { Media } from '@mytowatch/shared'

export default function SearchScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const { data: results, isLoading } = useSearch(query)

  const navigate = useCallback(
    (media: Media) =>
      router.push({ pathname: '/(app)/media/[id]', params: { id: media.tmdbId } }),
    [router],
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[typography.display, styles.pageTitle]}>Search</Text>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search movies & TV shows…"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          // On TV, auto-focus the input on first render so D-pad can type
          autoFocus={Platform.isTV}
        />
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {!isLoading && results && results.length === 0 && query.length >= 2 && (
        <View style={styles.center}>
          <Text style={[typography.body, { color: colors.textMuted }]}>No results for "{query}"</Text>
        </View>
      )}

      <FlatList
        data={results ?? []}
        keyExtractor={(item) => item.tmdbId}
        numColumns={Platform.isTV ? 6 : 3}
        contentContainerStyle={styles.grid}
        renderItem={({ item, index }) => (
          <PosterCard
            media={item}
            onPress={() => navigate(item)}
            hasTVPreferredFocus={index === 0}
          />
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  pageTitle: { marginBottom: spacing.md },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: Platform.isTV ? 20 : 16,
  },
  grid: {
    padding: spacing.xl,
    paddingLeft: spacing.xl + TV_OVERSCAN,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xxl },
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(app\)/search.tsx
git commit -m "feat(mobile): Search screen with live TMDB results"
```

---

## Task 8: Media Detail Screen

**Files:**
- Create: `apps/mobile/app/(app)/media/[id].tsx`

This is the most important screen: it shows the media poster, metadata, provider availability (Jellyfin/Netflix), and the Play deep-link button. The `id` param is the TMDB ID. The backend `GET /media/:id` takes the DB media ID, but the backend `GET /media/:id/providers` calls live plugins. Use the TMDB ID to first look up the media record.

**Important:** The app navigates to `/media/[id]` with the TMDB ID. The backend `GET /media/:id` uses the internal DB ID. To handle this, the app should first search by tmdbId via `GET /media/search?q={tmdbId}` or store the DB media ID. Simpler: use a two-step flow — when navigating from search results, pass the DB media ID in the URL. Update search screen navigation to use `media.id` (the backend DB id from tmdbResultToMedia — currently returns empty string `id: ''`).

**Backend fix needed:** Open `backend/src/services/mediaService.ts`. In `tmdbResultToMedia`, the returned `Media` has `id: ''`. When the app navigates to MediaDetail from search results, it needs a real DB ID. Fix: After searching, the app should call `POST /watchlist` with `tmdbId` to upsert the media record and get back a real ID. Or: add `GET /media/tmdb/:tmdbId` route. Simplest for now: On search result press, navigate with `tmdbId`, and in MediaDetail call `GET /media/search?q={tmdbId}&type=MOVIE` then grab the first result to get the DB ID.

**Practical approach:** navigate with tmdbId as `id`, then in MediaDetail:
1. Call `GET /media/search?q={tmdbId}` to get DB media ID
2. Call `GET /media/:dbId/providers`

OR: The user taps from Home (watchlist) → `mediaId` is the DB media ID. The user taps from Search → `tmdbId` is available. Handle both.

For simplicity, the plan passes the TMDB ID as the `id` param. MediaDetail fetches providers by first doing a search to get the DB record, then calling providers.

- [ ] **Step 1: Create media detail screen**

Create `apps/mobile/app/(app)/media/[id].tsx`:

```tsx
// apps/mobile/app/(app)/media/[id].tsx
import React, { useEffect, useState } from 'react'
import {
  View, Text, Image, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, Alert, Platform, Linking,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../src/lib/api'
import { useAddToWatchlist, useMediaProviders, useProgress, keys } from '../../../src/lib/queries'
import { ProviderChip } from '../../../src/components/ProviderChip'
import { ProgressBar } from '../../../src/components/ProgressBar'
import { FocusableItem } from '../../../src/components/FocusableItem'
import { colors, typography, spacing, TV_OVERSCAN, cardSize } from '../../../src/design/tokens'
import type { Media } from '@mytowatch/shared'
import type { ProviderAvailability } from '../../../src/lib/queries'

export default function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const addToWatchlist = useAddToWatchlist()

  // Step 1: resolve the tmdbId to a DB media record via search
  const { data: mediaRecord, isLoading: mediaLoading } = useQuery({
    queryKey: ['media-by-tmdb', id],
    queryFn: async () => {
      // If it looks like a DB ID (cuid) use it directly; otherwise search
      const isCuid = /^[a-z0-9]{20,}$/.test(id)
      if (isCuid) {
        return api.get<Media>(`/media/${id}`)
      }
      // Search by tmdbId
      const results = await api.get<Media[]>(`/media/search?q=${encodeURIComponent(id)}`)
      return results.find((r) => r.tmdbId === id) ?? results[0] ?? null
    },
    enabled: !!id,
  })

  const dbId = mediaRecord?.id
  const { data: providers, isLoading: providersLoading } = useMediaProviders(dbId ?? '')
  const { data: progress } = useProgress(dbId ?? '')

  const handlePlay = async (deepLink: string) => {
    const canOpen = await Linking.canOpenURL(deepLink)
    if (canOpen) {
      await Linking.openURL(deepLink)
    } else {
      Alert.alert('Cannot open', 'The provider app is not installed on this device.')
    }
  }

  const handleAddToWatchlist = async () => {
    if (!mediaRecord) return
    try {
      await addToWatchlist.mutateAsync({
        tmdbId: mediaRecord.tmdbId,
        type: mediaRecord.type,
        title: mediaRecord.title,
      })
      Alert.alert('Added', `"${mediaRecord.title}" added to your watchlist.`)
    } catch {
      Alert.alert('Error', 'Failed to add to watchlist.')
    }
  }

  if (mediaLoading || !mediaRecord) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    )
  }

  const meta = mediaRecord.metadata as {
    synopsis?: string
    rating?: number
    imdbRating?: number
    genres?: string[]
    cast?: string[]
    year?: number
    runtime?: number
    episodeCount?: number
  }

  const progressFraction =
    progress && meta.runtime
      ? Math.min(1, progress.positionSec / (meta.runtime * 60))
      : 0

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Hero row */}
      <View style={styles.hero}>
        {mediaRecord.poster ? (
          <Image source={{ uri: mediaRecord.poster }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]} />
        )}

        <View style={styles.info}>
          <Text style={typography.displayLg}>{mediaRecord.title}</Text>
          <Text style={[typography.caption, styles.meta]}>
            {[meta.year, mediaRecord.type === 'MOVIE' ? `${meta.runtime ?? '?'} min` : `${meta.episodeCount ?? '?'} eps`]
              .filter(Boolean).join('  ·  ')}
          </Text>
          {meta.rating !== undefined && (
            <Text style={[typography.body, styles.rating]}>
              ★ {meta.rating.toFixed(1)}{meta.imdbRating ? `  ·  IMDb ${meta.imdbRating.toFixed(1)}` : ''}
            </Text>
          )}
          {meta.genres && meta.genres.length > 0 && (
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {meta.genres.join(' · ')}
            </Text>
          )}
          {progressFraction > 0 && (
            <View style={{ marginTop: spacing.md, width: 240 }}>
              <ProgressBar progress={progressFraction} height={6} />
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <FocusableItem
              onPress={handleAddToWatchlist}
              hasTVPreferredFocus
              style={styles.btn}
            >
              <Text style={styles.btnText}>+ Watchlist</Text>
            </FocusableItem>
          </View>
        </View>
      </View>

      {/* Synopsis */}
      {meta.synopsis && (
        <View style={styles.section}>
          <Text style={[typography.heading, styles.sectionTitle]}>Synopsis</Text>
          <Text style={[typography.body, { color: colors.textMuted }]}>{meta.synopsis}</Text>
        </View>
      )}

      {/* Cast */}
      {meta.cast && meta.cast.length > 0 && (
        <View style={styles.section}>
          <Text style={[typography.heading, styles.sectionTitle]}>Cast</Text>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            {meta.cast.slice(0, 8).join(', ')}
          </Text>
        </View>
      )}

      {/* Providers */}
      <View style={styles.section}>
        <Text style={[typography.heading, styles.sectionTitle]}>Available On</Text>
        {providersLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : providers && providers.length > 0 ? (
          <View style={styles.chips}>
            {providers.map((p: ProviderAvailability) => (
              <ProviderChip
                key={p.providerId}
                providerName={p.providerName}
                status={p.availability.status}
                deepLink={p.deepLink}
                onPlay={p.deepLink ? () => handlePlay(p.deepLink!) : undefined}
              />
            ))}
          </View>
        ) : (
          <Text style={[typography.body, { color: colors.textMuted }]}>
            No providers configured. Add providers in Settings.
          </Text>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  hero: {
    flexDirection: Platform.isTV ? 'row' : 'column',
    marginBottom: spacing.xl,
    gap: spacing.xl,
  },
  poster: {
    width: Platform.isTV ? cardSize.poster.width * 1.5 : '100%',
    height: Platform.isTV ? cardSize.poster.height * 1.5 : 300,
    borderRadius: 12,
    backgroundColor: colors.bgCard,
  },
  posterPlaceholder: { backgroundColor: colors.bgCard },
  info: { flex: 1, justifyContent: 'flex-start' },
  meta: { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.sm },
  rating: { color: colors.warning, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.md },
  btn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  btnText: { color: colors.text, fontWeight: '700', fontSize: Platform.isTV ? 18 : 16 },
  section: { marginBottom: spacing.xl },
  sectionTitle: { marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(app\)/media
git commit -m "feat(mobile): MediaDetail screen with provider availability and Play deep-link"
```

---

## Task 9: Settings Screen (Admin)

**Files:**
- Create: `apps/mobile/app/(app)/settings/_layout.tsx`
- Create: `apps/mobile/app/(app)/settings/index.tsx`
- Create: `apps/mobile/app/(app)/settings/providers.tsx`
- Create: `apps/mobile/app/(app)/settings/providers-form.tsx`
- Create: `apps/mobile/app/(app)/settings/users.tsx`

- [ ] **Step 1: Create settings stack layout with admin guard**

```tsx
// apps/mobile/app/(app)/settings/_layout.tsx
import { Stack, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { useAuthStore } from '../../../src/lib/authStore'
import { colors } from '../../../src/design/tokens'

export default function SettingsLayout() {
  const router = useRouter()
  const role = useAuthStore((s) => s.role)

  useEffect(() => {
    if (role !== 'ADMIN') router.replace('/(app)/')
  }, [role])

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
  )
}
```

- [ ] **Step 2: Create settings home screen**

```tsx
// apps/mobile/app/(app)/settings/index.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { FocusableItem } from '../../../src/components/FocusableItem'
import { colors, typography, spacing } from '../../../src/design/tokens'

const ITEMS = [
  { label: 'Providers', sub: 'Configure Jellyfin, Netflix, and more', href: '/(app)/settings/providers' as const },
  { label: 'Users',     sub: 'Manage user roles and access',          href: '/(app)/settings/users' as const },
]

export default function SettingsScreen() {
  const router = useRouter()
  return (
    <View style={styles.container}>
      <Text style={[typography.displayLg, styles.title]}>Settings</Text>
      {ITEMS.map((item, idx) => (
        <FocusableItem
          key={item.href}
          onPress={() => router.push(item.href)}
          hasTVPreferredFocus={idx === 0}
          style={styles.row}
        >
          <Text style={typography.heading}>{item.label}</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>{item.sub}</Text>
        </FocusableItem>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  title: { marginBottom: spacing.xl },
  row: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
})
```

- [ ] **Step 3: Create providers screen**

```tsx
// apps/mobile/app/(app)/settings/providers.tsx
import React, { useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, Alert, ActivityIndicator, Switch,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useProviders, useUpdateProvider, useDeleteProvider } from '../../../src/lib/queries'
import { FocusableItem } from '../../../src/components/FocusableItem'
import { colors, typography, spacing } from '../../../src/design/tokens'
import type { ProviderRow } from '../../../src/lib/queries'

export default function ProvidersScreen() {
  const router = useRouter()
  const { data: providers, isLoading } = useProviders()
  const updateProvider = useUpdateProvider()
  const deleteProvider = useDeleteProvider()
  const [testingId, setTestingId] = useState<string | null>(null)

  const handleTest = async (p: ProviderRow) => {
    setTestingId(p.id)
    try {
      const result = await updateProvider.mutateAsync({ id: p.id, action: 'test' }) as { ok: boolean; message: string }
      Alert.alert(result.ok ? '✅ Connected' : '❌ Failed', result.message)
    } catch {
      Alert.alert('Error', 'Test failed')
    } finally {
      setTestingId(null)
    }
  }

  const handleDelete = (p: ProviderRow) => {
    Alert.alert('Remove Provider', `Remove "${p.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteProvider.mutate(p.id) },
    ])
  }

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[typography.displayLg]}>Providers</Text>
        <FocusableItem
          onPress={() => router.push('/(app)/settings/providers-form')}
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>+ Add Provider</Text>
        </FocusableItem>
      </View>

      <FlatList
        data={providers ?? []}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={
          <Text style={[typography.body, { color: colors.textMuted }]}>
            No providers configured. Add Jellyfin or Netflix to enable playback.
          </Text>
        }
        renderItem={({ item: p }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={typography.heading}>{p.name}</Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{p.pluginKey}</Text>
            </View>
            <Switch
              value={p.enabled}
              onValueChange={(v) => updateProvider.mutate({ id: p.id, enabled: v })}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
            <FocusableItem
              onPress={() => handleTest(p)}
              style={styles.smallBtn}
            >
              {testingId === p.id
                ? <ActivityIndicator color={colors.text} size="small" />
                : <Text style={styles.smallBtnText}>Test</Text>
              }
            </FocusableItem>
            <FocusableItem onPress={() => handleDelete(p)} style={[styles.smallBtn, styles.deleteBtn]}>
              <Text style={styles.smallBtnText}>✕</Text>
            </FocusableItem>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  addBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: 8 },
  addBtnText: { color: colors.text, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 12, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  rowInfo: { flex: 1 },
  smallBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6, padding: spacing.sm, minWidth: 48, alignItems: 'center' },
  deleteBtn: { backgroundColor: 'rgba(239,68,68,0.2)' },
  smallBtnText: { color: colors.text, fontWeight: '600' },
})
```

- [ ] **Step 4: Create providers form screen**

```tsx
// apps/mobile/app/(app)/settings/providers-form.tsx
import React, { useState } from 'react'
import {
  View, Text, TextInput, ScrollView, StyleSheet, Alert, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useCreateProvider } from '../../../src/lib/queries'
import { FocusableItem } from '../../../src/components/FocusableItem'
import { colors, typography, spacing } from '../../../src/design/tokens'

const PLUGIN_OPTIONS = [
  { key: 'jellyfin', label: 'Jellyfin', fields: [
    { name: 'serverUrl', label: 'Server URL', placeholder: 'http://192.168.1.10:8096', secret: false },
    { name: 'apiKey', label: 'API Key', placeholder: 'From Dashboard → API Keys', secret: true },
    { name: 'jellyfinUserId', label: 'User ID', placeholder: 'From Dashboard → Users → click user', secret: false },
  ]},
  { key: 'netflix', label: 'Netflix', fields: [] },
]

export default function ProvidersFormScreen() {
  const router = useRouter()
  const createProvider = useCreateProvider()
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [config, setConfig] = useState<Record<string, string>>({})

  const plugin = PLUGIN_OPTIONS.find((p) => p.key === selectedPlugin)

  const handleSave = async () => {
    if (!selectedPlugin || !name) {
      Alert.alert('Required', 'Enter a name and select a plugin.')
      return
    }
    try {
      await createProvider.mutateAsync({ name, pluginKey: selectedPlugin, config })
      router.back()
    } catch {
      Alert.alert('Error', 'Failed to create provider.')
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={[typography.displayLg, styles.title]}>Add Provider</Text>

      {/* Plugin selection */}
      <Text style={[typography.heading, styles.label]}>Plugin</Text>
      <View style={styles.pluginRow}>
        {PLUGIN_OPTIONS.map((p) => (
          <FocusableItem
            key={p.key}
            onPress={() => { setSelectedPlugin(p.key); setConfig({}) }}
            style={[styles.pluginChip, selectedPlugin === p.key && styles.pluginChipActive]}
          >
            <Text style={[typography.body, selectedPlugin === p.key && { color: colors.accent }]}>
              {p.label}
            </Text>
          </FocusableItem>
        ))}
      </View>

      {/* Name */}
      <Text style={[typography.heading, styles.label]}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Jellyfin Home Server"
        placeholderTextColor={colors.textMuted}
      />

      {/* Plugin-specific config fields */}
      {plugin?.fields.map((f) => (
        <View key={f.name}>
          <Text style={[typography.heading, styles.label]}>{f.label}</Text>
          <TextInput
            style={styles.input}
            value={config[f.name] ?? ''}
            onChangeText={(v) => setConfig((c) => ({ ...c, [f.name]: v }))}
            placeholder={f.placeholder}
            placeholderTextColor={colors.textMuted}
            secureTextEntry={f.secret}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      ))}

      {plugin && (
        <FocusableItem
          onPress={handleSave}
          style={styles.saveBtn}
          hasTVPreferredFocus
        >
          {createProvider.isPending
            ? <ActivityIndicator color={colors.text} />
            : <Text style={styles.saveBtnText}>Save Provider</Text>
          }
        </FocusableItem>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  title: { marginBottom: spacing.xl },
  label: { marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  pluginRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  pluginChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  pluginChipActive: { borderColor: colors.accent, backgroundColor: colors.bgCardFocused },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveBtnText: { color: colors.text, fontWeight: '700', fontSize: 16 },
})
```

- [ ] **Step 5: Create users screen**

```tsx
// apps/mobile/app/(app)/settings/users.tsx
import React from 'react'
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native'
import { useUsers, useUpdateUserRole, useDeleteUser } from '../../../src/lib/queries'
import { FocusableItem } from '../../../src/components/FocusableItem'
import { colors, typography, spacing } from '../../../src/design/tokens'
import { useAuthStore } from '../../../src/lib/authStore'

export default function UsersScreen() {
  const { data: users, isLoading } = useUsers()
  const updateRole = useUpdateUserRole()
  const deleteUser = useDeleteUser()
  const myId = useAuthStore((s) => s.userId)

  const handleRoleToggle = (id: string, currentRole: 'ADMIN' | 'VIEWER') => {
    const newRole = currentRole === 'ADMIN' ? 'VIEWER' : 'ADMIN'
    Alert.alert('Change Role', `Set role to ${newRole}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => updateRole.mutate({ id, role: newRole }) },
    ])
  }

  const handleDelete = (id: string, email: string) => {
    if (id === myId) { Alert.alert('Error', 'Cannot delete your own account.'); return }
    Alert.alert('Delete User', `Delete ${email}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteUser.mutate(id) },
    ])
  }

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
  }

  return (
    <View style={styles.container}>
      <Text style={[typography.displayLg, styles.title]}>Users</Text>
      <FlatList
        data={users ?? []}
        keyExtractor={(u) => u.id}
        renderItem={({ item: u }) => (
          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={typography.body}>{u.email}</Text>
              <Text style={[typography.caption, { color: u.role === 'ADMIN' ? colors.accent : colors.textMuted }]}>
                {u.role}
              </Text>
            </View>
            {u.id !== myId && (
              <>
                <FocusableItem onPress={() => handleRoleToggle(u.id, u.role)} style={styles.btn}>
                  <Text style={styles.btnText}>{u.role === 'ADMIN' ? 'Make Viewer' : 'Make Admin'}</Text>
                </FocusableItem>
                <FocusableItem onPress={() => handleDelete(u.id, u.email)} style={[styles.btn, styles.deleteBtn]}>
                  <Text style={styles.btnText}>Delete</Text>
                </FocusableItem>
              </>
            )}
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  title: { marginBottom: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 12, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  info: { flex: 1 },
  btn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  deleteBtn: { backgroundColor: 'rgba(239,68,68,0.2)' },
  btnText: { color: colors.text, fontWeight: '600' },
})
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/\(app\)/settings
git commit -m "feat(mobile): Settings screens — providers CRUD + test, user role management"
```

---

## Task 10: Profile Screen + Backend Watchlist Fix

**Files:**
- Create: `apps/mobile/app/(app)/profile.tsx`
- Modify: `backend/src/services/watchlistService.ts` — include media in response

- [ ] **Step 1: Fix backend to include media in watchlist items**

Open `backend/src/services/watchlistService.ts`. Find the `getUserWatchlist` function (returns all watchlist items for a user). Add `include` to return media data:

```typescript
// In getUserWatchlist, change the findMany call to:
export async function getUserWatchlist(userId: string) {
  return prisma.watchlistItem.findMany({
    where: { userId },
    include: {
      media: {
        select: { id: true, tmdbId: true, title: true, poster: true, type: true },
      },
    },
    orderBy: { addedAt: 'desc' },
  })
}
```

Run the existing watchlist tests to confirm nothing breaks:
```bash
wsl -d Ubuntu -- bash -ic "docker start backend-db-1 2>/dev/null; sleep 1; cd /mnt/c/web.projects/myToWatch/backend && pnpm test tests/watchlist.test.ts"
```

Commit:
```bash
git add backend/src/services/watchlistService.ts
git commit -m "feat(watchlist): include media fields in watchlist response for mobile app"
```

- [ ] **Step 2: Create profile screen**

```tsx
// apps/mobile/app/(app)/profile.tsx
import React from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native'
import { useWatchlist, useSyncProgress } from '../../src/lib/queries'
import { useAuthStore } from '../../src/lib/authStore'
import { FocusableItem } from '../../src/components/FocusableItem'
import { colors, typography, spacing } from '../../src/design/tokens'
import { useRouter } from 'expo-router'

export default function ProfileScreen() {
  const router = useRouter()
  const { logout, role } = useAuthStore()
  const { data: watchlist } = useWatchlist()
  const syncProgress = useSyncProgress()

  const items = watchlist ?? []
  const done = items.filter((w) => w.status === 'DONE').length
  const watching = items.filter((w) => w.status === 'WATCHING').length
  const plan = items.filter((w) => w.status === 'PLAN').length

  const handleSync = async () => {
    try {
      const result = await syncProgress.mutateAsync()
      Alert.alert('Sync Complete', `Synced ${result.synced} progress record${result.synced === 1 ? '' : 's'} from providers.`)
    } catch {
      Alert.alert('Sync Failed', 'Could not sync progress. Check provider settings.')
    }
  }

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Sign out of myToWatch?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { logout(); router.replace('/login') } },
    ])
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={[typography.displayLg, styles.title]}>Profile</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Watching', value: watching },
          { label: 'Completed', value: done },
          { label: 'Plan to Watch', value: plan },
        ].map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={[typography.displayLg, { color: colors.accent }]}>{stat.value}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <FocusableItem
          onPress={handleSync}
          hasTVPreferredFocus
          style={styles.actionRow}
        >
          <View style={styles.actionInfo}>
            <Text style={typography.heading}>Sync Progress</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Pull watch progress from Jellyfin
            </Text>
          </View>
          {syncProgress.isPending
            ? <ActivityIndicator color={colors.accent} />
            : <Text style={[typography.body, { color: colors.accent }]}>Sync ↻</Text>
          }
        </FocusableItem>

        {role === 'ADMIN' && (
          <FocusableItem onPress={() => router.push('/(app)/settings/')} style={styles.actionRow}>
            <Text style={typography.heading}>Settings</Text>
          </FocusableItem>
        )}

        <FocusableItem onPress={handleLogout} style={[styles.actionRow, styles.logoutRow]}>
          <Text style={[typography.heading, { color: colors.error }]}>Sign Out</Text>
        </FocusableItem>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  title: { marginBottom: spacing.xl },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: { gap: spacing.md },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionInfo: { flex: 1 },
  logoutRow: { borderColor: 'rgba(239,68,68,0.3)' },
})
```

- [ ] **Step 3: Run all backend tests to confirm no regressions**

```bash
wsl -d Ubuntu -- bash -ic "docker start backend-db-1 2>/dev/null; sleep 1; cd /mnt/c/web.projects/myToWatch/backend && pnpm test"
```

Expected: 61 tests pass (watchlist tests may need updating if they assert exact response shape — update assertions to include the new `media` field, or use `expect.objectContaining`).

- [ ] **Step 4: Run mobile TypeScript check**

```bash
cd apps/mobile && pnpm lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(app\)/profile.tsx
git commit -m "feat(mobile): Profile screen with stats, manual sync, and sign-out"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task | Status |
|---|---|---|
| Expo SDK 52 app in `apps/mobile/` | Task 1 | ✅ |
| Android TV LEANBACK_LAUNCHER config | Task 1 | ✅ |
| API client with auto-refresh | Task 2 | ✅ |
| Auth store (Zustand + SecureStore) | Task 2 | ✅ |
| Server URL onboarding + connection test | Task 5 | ✅ |
| Login / Register screen | Task 5 | ✅ |
| Auth gate (redirects if not authed) | Task 5 | ✅ |
| Design system (Nocturne Cinema) | Task 3 | ✅ |
| TV-aware FocusableItem with focus ring | Task 3 | ✅ |
| TV side nav with D-pad | Task 5 | ✅ |
| iOS bottom tabs | Task 5 | ✅ |
| Overscan-safe margins (48px) | Task 3, 5 | ✅ |
| Home/Dashboard (Continue Watching, Watchlist, Recent) | Task 6 | ✅ |
| Search screen (live TMDB) | Task 7 | ✅ |
| MediaDetail (poster, synopsis, cast, genres, rating) | Task 8 | ✅ |
| Provider chips (Jellyfin, Netflix availability) | Task 8 | ✅ |
| Play → deep-link to provider app | Task 8 | ✅ |
| Add to Watchlist button | Task 8 | ✅ |
| Progress bar on MediaDetail | Task 8 | ✅ |
| Settings: providers list + enable/disable | Task 9 | ✅ |
| Settings: add Jellyfin/Netflix provider | Task 9 | ✅ |
| Settings: test provider connection | Task 9 | ✅ |
| Settings: users list + role management | Task 9 | ✅ |
| Profile: stats (watching, done, plan) | Task 10 | ✅ |
| Profile: manual progress sync trigger | Task 10 | ✅ |
| Profile: sign out | Task 10 | ✅ |
| Media included in watchlist response | Task 10 | ✅ |
| `hasTVPreferredFocus` on first elements | Tasks 3–10 | ✅ |

**Placeholder scan:** No TBD, TODO, or "implement later" patterns. All code blocks are complete.

**Type consistency:**
- `ProviderAvailability` defined in `queries.ts` and imported in `media/[id].tsx` ✅
- `AuthState` defined in `authStore.ts`, used consistently across all screens ✅
- `ProviderRow`, `UserRow`, `Progress` defined in `queries.ts`, used in their screens ✅
- `keys.*` query key factory used in mutations for invalidation ✅
- `TV_OVERSCAN`, `TV_SIDE_NAV_WIDTH`, `isTV` from `tokens.ts` used in layout ✅

**Known limitations (acceptable for v1):**
- MediaDetail uses TMDB ID search to resolve DB ID — may be slow on first load. A dedicated `GET /media/tmdb/:tmdbId` backend route would be faster but is out of scope.
- No offline mode — requires network connection to backend.
- No push notifications.
- Android TV build requires `expo prebuild` then `expo run:android --device` targeting a TV emulator or physical Android TV device.

**Running on Android TV:**
```bash
# Start Android TV emulator (API 30+, ATV image) in Android Studio first, or connect ATV device
cd apps/mobile
npx expo run:android
# The app will appear in the TV launcher under "Apps" (LEANBACK_LAUNCHER)
```
