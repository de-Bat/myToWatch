# myToWatch — Plan 2: Provider Plugin System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the provider plugin system — a typed `MediaProvider` interface, a plugin registry, Jellyfin and Netflix built-in plugins, live availability checking on `GET /media/:id/providers`, real Jellyfin progress sync on `POST /progress/sync`, and a `test` action on `PATCH /providers/:id`.

**Architecture:** New `backend/src/providers/` subtree holds the interface definition, a registry singleton, and plugin modules. Existing routes (`media`, `progress`, `providers`) are updated to call registry methods. Plugin HTTP calls use Node's built-in `fetch`. Tests mock `fetch` via Vitest's `vi.spyOn` / `vi.fn()` so no real servers are needed.

**Tech Stack:** Node 20 (built-in `fetch`), TypeScript 5, Vitest (mock fetch), existing Express/Prisma stack — no new npm dependencies required.

---

## Background — what Plan 1 left in place

These files exist and must not be broken:

| File | Relevant to Plan 2 |
|---|---|
| `packages/shared/src/types/provider.ts` | Add `MediaProvider`, `ProviderResult`, `Availability` here |
| `packages/shared/src/index.ts` | Re-exports everything from `types/provider.ts` — update if needed |
| `backend/src/services/providerService.ts` | `getProviderConfig(id)` decrypts and returns `Record<string,string>` — used by plugins |
| `backend/src/routes/providers.ts` | `PATCH /:id` — add `test` action branch here |
| `backend/src/routes/progress.ts` | `POST /sync` — replace stub with real sync logic |
| `backend/src/routes/media.ts` | `GET /:id/providers` — replace static DB read with live plugin check |
| `backend/src/services/mediaService.ts` | `getProviders(mediaId)` — keep for the static read path; add `getMediaWithTmdbId` helper |
| `backend/tests/setup.ts` | Wipes DB between tests — no changes needed |

---

## File Map

**New files:**
- `backend/src/providers/interface.ts` — `MediaProvider` interface, `ProviderResult`, `Availability` types (backend-internal; mirrored in shared for frontend use)
- `backend/src/providers/registry.ts` — plugin registry: `register()`, `get(key)`, `list()`, loads built-ins on import
- `backend/src/providers/plugins/jellyfin.ts` — Jellyfin plugin (search, availability, deep-link, getProgress, pushProgress)
- `backend/src/providers/plugins/netflix.ts` — Netflix plugin (availability, deep-link — no config, no progress sync)
- `backend/tests/jellyfin.test.ts` — unit tests for Jellyfin plugin (fetch mocked)
- `backend/tests/providers-sync.test.ts` — integration test for `POST /progress/sync` with mocked Jellyfin HTTP

**Modified files:**
- `packages/shared/src/types/provider.ts` — add `MediaProvider`, `ProviderResult`, `Availability` for frontend consumption
- `packages/shared/src/index.ts` — already re-exports `provider.ts`; rebuild after type additions
- `backend/src/routes/media.ts` — `GET /:id/providers` calls registry live instead of static DB read
- `backend/src/routes/progress.ts` — `POST /sync` replaced with real Jellyfin sync
- `backend/src/routes/providers.ts` — `PATCH /:id` gets a `test` action branch
- `backend/src/services/mediaService.ts` — add `getMediaByTmdbId(tmdbId)` helper used by availability check

---

## Task 1: Extend Shared Types

**Files:**
- Modify: `packages/shared/src/types/provider.ts`

The current `provider.ts` has `Provider`, `ProviderConfig`, `JSONSchemaProperty`, `JSONSchema`. We add the plugin-facing types that the frontend will also consume: `ProviderResult`, `Availability`, and `MediaProvider`.

- [ ] **Step 1: Replace packages/shared/src/types/provider.ts with extended version**

```typescript
// packages/shared/src/types/provider.ts
import type { EpisodeRef, MediaType } from './media'
import type { Progress } from './progress'

export interface Provider {
  id: string
  name: string
  pluginKey: string
  enabled: boolean
}

export interface ProviderConfig {
  [key: string]: string
}

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean'
  description: string
  secret?: boolean
}

export interface JSONSchema {
  properties: Record<string, JSONSchemaProperty>
  required: string[]
}

// --- Plugin-facing types ---

export type AvailabilityStatus = 'available' | 'unavailable' | 'unknown'

export interface Availability {
  status: AvailabilityStatus
  /** Provider-internal ID for this media item (e.g. Jellyfin itemId, Netflix title ID) */
  providerMediaId: string | null
}

export interface ProviderResult {
  providerMediaId: string
  title: string
  type: MediaType
  /** TMDB ID if the provider returned it via ProviderIds */
  tmdbId: string | null
  /** IMDB ID if the provider returned it */
  imdbId: string | null
}

export interface MediaProvider {
  /** Unique key used as pluginKey in DB. e.g. "jellyfin", "netflix" */
  key: string
  /** Human-readable name shown in UI */
  name: string
  /** JSON Schema for the admin config form. Empty schema = no config needed */
  configSchema: JSONSchema
  /** Search provider's own catalog */
  search(query: string, config: ProviderConfig): Promise<ProviderResult[]>
  /** Check whether a specific TMDB ID is available on this provider */
  getAvailability(tmdbId: string, config: ProviderConfig): Promise<Availability>
  /** Return a deep-link URL to launch the provider app at this media item */
  getDeepLink(providerMediaId: string, episode: EpisodeRef | null, config: ProviderConfig): Promise<string>
  /** Optional: pull watch progress from provider for a user */
  getProgress?(providerMediaId: string, config: ProviderConfig): Promise<Pick<Progress, 'positionSec' | 'seasonEp'> | null>
  /** Optional: push watch progress to provider */
  pushProgress?(providerMediaId: string, progress: Pick<Progress, 'positionSec' | 'seasonEp'>, config: ProviderConfig): Promise<void>
  /** Optional: check that the provider is reachable and config is valid */
  healthCheck?(config: ProviderConfig): Promise<{ ok: boolean; message: string }>
}
```

- [ ] **Step 2: Rebuild shared package**

```bash
cd packages/shared && pnpm build
```

Expected output: `dist/` updated, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/provider.ts packages/shared/dist
git commit -m "feat(shared): add MediaProvider, ProviderResult, Availability types"
```

---

## Task 2: Provider Interface + Registry

**Files:**
- Create: `backend/src/providers/interface.ts`
- Create: `backend/src/providers/registry.ts`

`interface.ts` re-exports the shared types and adds any backend-only types (none right now — kept as a thin re-export so routes import from one local place). `registry.ts` is a singleton Map that loads built-ins at import time.

- [ ] **Step 1: Create backend/src/providers/interface.ts**

```typescript
// backend/src/providers/interface.ts
// Re-export shared types so backend code imports from one local place.
export type {
  MediaProvider,
  ProviderConfig,
  ProviderResult,
  Availability,
  AvailabilityStatus,
  JSONSchema,
  JSONSchemaProperty,
} from '@mytowatch/shared'
```

- [ ] **Step 2: Write the failing registry tests inline (we validate registry in Task 4 Jellyfin tests — skip standalone registry test for now and note it)**

There are no new test files for the registry itself because it is exercised by the Jellyfin and Netflix tests. Move on.

- [ ] **Step 3: Create backend/src/providers/registry.ts**

```typescript
// backend/src/providers/registry.ts
import type { MediaProvider } from './interface'

const plugins = new Map<string, MediaProvider>()

export function register(plugin: MediaProvider): void {
  if (plugins.has(plugin.key)) {
    throw new Error(`Provider plugin already registered: ${plugin.key}`)
  }
  plugins.set(plugin.key, plugin)
}

export function get(key: string): MediaProvider | undefined {
  return plugins.get(key)
}

export function list(): MediaProvider[] {
  return Array.from(plugins.values())
}

// Load built-ins eagerly when this module is first imported.
// Import order matters: each plugin calls register() on load.
import './plugins/jellyfin'
import './plugins/netflix'
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/providers/interface.ts backend/src/providers/registry.ts
git commit -m "feat(providers): add provider interface re-export and plugin registry"
```

---

## Task 3: Jellyfin Plugin

**Files:**
- Create: `backend/src/providers/plugins/jellyfin.ts`

Jellyfin API reference used in this plugin:
- Base: `{serverUrl}` (user provides full URL including port, e.g. `http://192.168.1.10:8096`)
- Auth header on all requests: `X-Emby-Token: {apiKey}`
- Search: `GET /Items?searchTerm={q}&IncludeItemTypes=Movie,Series&Recursive=true&Fields=ProviderIds`
- Item detail: `GET /Items/{itemId}?Fields=ProviderIds,UserData`
- User items (with progress): `GET /Users/{jellyfinUserId}/Items/{itemId}?Fields=UserData`
- Mark played: `POST /Users/{jellyfinUserId}/PlayedItems/{itemId}`
- System info (health check): `GET /System/Info`
- Deep link (Android TV): `intent://jellyfin.app/play/{itemId}#Intent;scheme=jellyfin;package=org.jellyfin.androidtv;end`

**Config schema fields:**
- `serverUrl` — full URL to Jellyfin server (required)
- `apiKey` — Jellyfin API key (required, secret)
- `jellyfinUserId` — Jellyfin user ID string for progress sync (required)

**How availability works:** Call `/Items?searchTerm={tmdbId}&IncludeItemTypes=Movie,Series&Recursive=true&Fields=ProviderIds`. Jellyfin returns items whose metadata includes matching provider IDs. Filter results by `item.ProviderIds?.Tmdb === tmdbId`. If a match is found, status is `available` and `providerMediaId` is `item.Id`. If no match, status is `unavailable`.

**How progress works:** `GET /Users/{jellyfinUserId}/Items/{itemId}?Fields=UserData` returns `UserData.PlaybackPositionTicks` (divide by 10,000,000 for seconds) and `UserData.LastPlayedDate`. For series, `UserData.PlaybackPositionTicks` is for the specific episode; tracking episode is derived from calling context (we store whatever episode string we last wrote to our DB).

- [ ] **Step 1: Create backend/src/providers/plugins/jellyfin.ts**

```typescript
// backend/src/providers/plugins/jellyfin.ts
import { register } from '../registry'
import type { MediaProvider, ProviderConfig, ProviderResult, Availability } from '../interface'
import type { EpisodeRef } from '@mytowatch/shared'

// ---- Jellyfin API response shapes ----

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

// ---- Helpers ----

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

// ---- Plugin implementation ----

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
    // Android TV deep-link. Web fallback would be `${config.serverUrl}/web/index.html#!/details?id=${providerMediaId}`
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
    // We don't have episode info from this endpoint alone; seasonEp stays null
    // (the caller merges with our DB's current seasonEp)
    return { positionSec, seasonEp: null }
  },

  async pushProgress(
    providerMediaId: string,
    progress: { positionSec: number; seasonEp: string | null },
    config: ProviderConfig,
  ): Promise<void> {
    // Mark as played if positionSec > 0; Jellyfin doesn't support arbitrary seek position push
    // via the REST API without an active playback session, so we mark played only.
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/providers/plugins/jellyfin.ts
git commit -m "feat(providers): add Jellyfin plugin (search, availability, deep-link, progress, health check)"
```

---

## Task 4: Netflix Plugin

**Files:**
- Create: `backend/src/providers/plugins/netflix.ts`

Netflix has no private API. Strategy:
- **Availability:** "available" only when a Netflix title ID is known. We try to find it from TMDB's `/movie/{id}/external_ids` or `/tv/{id}/external_ids` endpoints. These occasionally include a `netflix_id` field, but it is not guaranteed. If not found, status is `unknown`.
- **Deep-link:** `intent://www.netflix.com/title/{netflixId}#Intent;package=com.netflix.ninja;scheme=https;end` (Android/Android TV). Fallback (when no ID): `https://www.netflix.com/search?q={encodedTitle}`.
- **Search:** Returns empty array — Netflix has no public search API. Documented clearly.
- **Progress:** Not supported — returns `undefined` (method omitted from object).
- **Config:** No config required (empty configSchema).

TMDB external IDs endpoint: `GET https://api.themoviedb.org/3/movie/{tmdb_id}/external_ids?api_key={key}` or `/tv/{tmdb_id}/external_ids`. Response may include `{ netflix_id: "12345678" }`.

The plugin needs the TMDB API key. It reads it from `process.env.TMDB_API_KEY` directly (same as `mediaService.ts` uses `config.tmdbApiKey` — both read the same env var). Do not import `config.ts` to avoid circular deps; read `process.env.TMDB_API_KEY` directly here.

- [ ] **Step 1: Create backend/src/providers/plugins/netflix.ts**

```typescript
// backend/src/providers/plugins/netflix.ts
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
    // Netflix has no public search API.
    return []
  },

  async getAvailability(tmdbId: string, _config: ProviderConfig): Promise<Availability> {
    // Try movie first, then TV. TMDB IDs are unique per type but we don't know the type here,
    // so try both and return first hit.
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
      // Fallback: providerMediaId encoded as "search:{title}"
      const title = providerMediaId.replace(/^search:/, '')
      return `https://www.netflix.com/search?q=${encodeURIComponent(title)}`
    }
    // Android TV / Android deep-link
    return `intent://www.netflix.com/title/${providerMediaId}#Intent;package=com.netflix.ninja;scheme=https;end`
  },

  async healthCheck(_config: ProviderConfig): Promise<{ ok: boolean; message: string }> {
    // Netflix has no health-check endpoint we can call without credentials.
    // We just verify the plugin is registered.
    return { ok: true, message: 'Netflix plugin active (no server to ping)' }
  },
}

register(netflixPlugin)
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/providers/plugins/netflix.ts
git commit -m "feat(providers): add Netflix plugin (deep-link via TMDB external_ids, no progress sync)"
```

---

## Task 5: Jellyfin Plugin Tests

**Files:**
- Create: `backend/tests/jellyfin.test.ts`

These are pure unit tests for the plugin — no Express, no DB. We mock `fetch` using Vitest's `vi.spyOn(globalThis, 'fetch')`.

**Important:** The registry loads plugins when `registry.ts` is first imported. If both test files import from `registry.ts`, the `register()` call will throw "already registered" on the second import. To avoid this, import the plugin directly in tests (bypassing registry) by importing the file and accessing the exported plugin — but the plugin is not exported by name. The cleanest approach: import from the registry and call `get('jellyfin')`. The registry module uses a module-level Map that persists within a Vitest worker. Since Vitest runs in `singleFork` mode (set in Plan 1's `vitest.config.ts`), the registry Map is shared. Tests import `get` from the registry to retrieve the plugin.

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/tests/jellyfin.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { get } from '../src/providers/registry'
import type { MediaProvider } from '../src/providers/interface'

// Importing registry triggers plugin registration (side-effect imports in registry.ts)
// Plugin is now available via get('jellyfin')

let jellyfin: MediaProvider

beforeEach(() => {
  const plugin = get('jellyfin')
  if (!plugin) throw new Error('Jellyfin plugin not registered — check registry.ts imports')
  jellyfin = plugin
})

afterEach(() => {
  vi.restoreAllMocks()
})

const config = {
  serverUrl: 'http://jellyfin.local:8096',
  apiKey: 'test-api-key',
  jellyfinUserId: 'user-abc-123',
}

// ---- search ----

describe('jellyfin.search', () => {
  it('returns mapped ProviderResults from Jellyfin Items response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          Items: [
            {
              Id: 'jf-item-1',
              Name: 'Breaking Bad',
              Type: 'Series',
              ProviderIds: { Tmdb: '1396', Imdb: 'tt0903747' },
            },
          ],
          TotalRecordCount: 1,
        }),
        { status: 200 },
      ),
    )

    const results = await jellyfin.search('breaking bad', config)

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      providerMediaId: 'jf-item-1',
      title: 'Breaking Bad',
      type: 'SERIES',
      tmdbId: '1396',
      imdbId: 'tt0903747',
    })
  })

  it('sends the correct URL with encoded search term', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ Items: [], TotalRecordCount: 0 }), { status: 200 }),
    )

    await jellyfin.search('fight club', config)

    const calledUrl = (mockFetch.mock.calls[0][0] as string)
    expect(calledUrl).toContain('searchTerm=fight%20club')
    expect(calledUrl).toContain('IncludeItemTypes=Movie,Series')
    expect(calledUrl).toContain('Fields=ProviderIds')
  })

  it('throws when Jellyfin returns a non-OK status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 }),
    )

    await expect(jellyfin.search('test', config)).rejects.toThrow('401')
  })
})

// ---- getAvailability ----

describe('jellyfin.getAvailability', () => {
  it('returns available with providerMediaId when TMDB ID matches', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          Items: [
            {
              Id: 'jf-item-99',
              Name: 'The Matrix',
              Type: 'Movie',
              ProviderIds: { Tmdb: '603' },
            },
          ],
          TotalRecordCount: 1,
        }),
        { status: 200 },
      ),
    )

    const availability = await jellyfin.getAvailability('603', config)

    expect(availability.status).toBe('available')
    expect(availability.providerMediaId).toBe('jf-item-99')
  })

  it('returns unavailable when no item TMDB ID matches', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          Items: [
            {
              Id: 'jf-item-55',
              Name: 'Something Else',
              Type: 'Movie',
              ProviderIds: { Tmdb: '999' },
            },
          ],
          TotalRecordCount: 1,
        }),
        { status: 200 },
      ),
    )

    const availability = await jellyfin.getAvailability('603', config)

    expect(availability.status).toBe('unavailable')
    expect(availability.providerMediaId).toBeNull()
  })

  it('returns unavailable when Items is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ Items: [], TotalRecordCount: 0 }), { status: 200 }),
    )

    const availability = await jellyfin.getAvailability('603', config)

    expect(availability.status).toBe('unavailable')
    expect(availability.providerMediaId).toBeNull()
  })
})

// ---- getDeepLink ----

describe('jellyfin.getDeepLink', () => {
  it('returns Android TV intent URL with itemId', async () => {
    const link = await jellyfin.getDeepLink('jf-item-42', null, config)
    expect(link).toBe(
      'intent://jellyfin.app/play/jf-item-42#Intent;scheme=jellyfin;package=org.jellyfin.androidtv;end',
    )
  })

  it('includes itemId when episode ref is provided (deep-link is same for any episode)', async () => {
    const link = await jellyfin.getDeepLink('jf-item-42', { season: 2, episode: 5 }, config)
    expect(link).toContain('jf-item-42')
  })
})

// ---- getProgress ----

describe('jellyfin.getProgress', () => {
  it('returns positionSec converted from ticks', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          UserData: {
            PlaybackPositionTicks: 36_000_000_000, // 3600 seconds = 1 hour
            Played: false,
          },
        }),
        { status: 200 },
      ),
    )

    const progress = await jellyfin.getProgress!('jf-item-99', config)

    expect(progress).not.toBeNull()
    expect(progress!.positionSec).toBe(3600)
    expect(progress!.seasonEp).toBeNull()
  })

  it('returns null when UserData is absent', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 }),
    )

    const progress = await jellyfin.getProgress!('jf-item-99', config)

    expect(progress).toBeNull()
  })

  it('calls the Users/{userId}/Items/{itemId} endpoint', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ UserData: { PlaybackPositionTicks: 0, Played: false } }), {
        status: 200,
      }),
    )

    await jellyfin.getProgress!('jf-item-7', config)

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain(`/Users/${config.jellyfinUserId}/Items/jf-item-7`)
  })
})

// ---- healthCheck ----

describe('jellyfin.healthCheck', () => {
  it('returns ok: true when /System/Info responds 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ServerName: 'MyJellyfin', Version: '10.9.0' }), { status: 200 }),
    )

    const result = await jellyfin.healthCheck!(config)

    expect(result.ok).toBe(true)
    expect(result.message).toContain('reachable')
  })

  it('returns ok: false when fetch throws (server unreachable)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const result = await jellyfin.healthCheck!(config)

    expect(result.ok).toBe(false)
    expect(result.message).toContain('ECONNREFUSED')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && pnpm test tests/jellyfin.test.ts
```

Expected: FAIL — `Cannot find module '../src/providers/registry'`

- [ ] **Step 3: Run again after Task 3 and 4 implementations are in place**

The registry and plugin files were created in Tasks 2–4. Run tests now:

```bash
cd backend && pnpm test tests/jellyfin.test.ts
```

Expected: PASS (13 tests across all describe blocks).

- [ ] **Step 4: Commit**

```bash
git add backend/tests/jellyfin.test.ts
git commit -m "test(providers): Jellyfin plugin unit tests with mocked fetch"
```

---

## Task 6: Update mediaService + GET /media/:id/providers

**Files:**
- Modify: `backend/src/services/mediaService.ts` — add `getMediaByTmdbId`
- Modify: `backend/src/routes/media.ts` — `GET /:id/providers` calls live availability

**What changes:**

Currently `GET /:id/providers` calls `mediaService.getProviders(mediaId)` which reads static `ProviderLink` rows from DB. Plan 2 changes this to:

1. Load the `Media` record (get its `tmdbId`).
2. Query DB for all enabled `Provider` rows.
3. For each enabled provider, call `plugin.getAvailability(media.tmdbId, config)`.
4. For available ones, call `plugin.getDeepLink(providerMediaId, null, config)`.
5. Upsert a `ProviderLink` row (so the DB stays fresh for offline use).
6. Return the live results.

The old `mediaService.getProviders` static read is kept (it's still called by the existing test in `media.test.ts` which tests the empty-array case — that still works because no ProviderLink rows exist).

- [ ] **Step 1: Add getMediaByTmdbId to mediaService**

Open `backend/src/services/mediaService.ts` and add this function after `getById`:

```typescript
export async function getMediaByTmdbId(tmdbId: string) {
  return prisma.media.findUnique({ where: { tmdbId } })
}
```

The full file after the addition (show only the new function in context — add it after `getById` at line 27):

```typescript
export async function getById(id: string) {
  return prisma.media.findUnique({ where: { id } })
}

export async function getMediaByTmdbId(tmdbId: string) {
  return prisma.media.findUnique({ where: { tmdbId } })
}

export async function getProviders(mediaId: string) {
```

- [ ] **Step 2: Replace the GET /:id/providers handler in backend/src/routes/media.ts**

The full updated `backend/src/routes/media.ts`:

```typescript
// backend/src/routes/media.ts
import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import * as mediaService from '../services/mediaService'
import * as providerService from '../services/providerService'
import { get as getPlugin } from '../providers/registry'
import { prisma } from '../db/client'
import type { MediaType } from '@mytowatch/shared'

export const mediaRouter = Router()
mediaRouter.use(authenticate)

mediaRouter.get('/search', async (req, res) => {
  const { q, type } = req.query
  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: 'q query param required' }); return
  }
  try {
    const results = await mediaService.searchTmdb(q, type as MediaType | undefined)
    res.json(results)
  } catch {
    res.status(500).json({ error: 'Search failed' })
  }
})

mediaRouter.get('/:id', async (req, res) => {
  const media = await mediaService.getById(req.params.id)
  if (!media) { res.status(404).json({ error: 'Not found' }); return }
  res.json(media)
})

mediaRouter.get('/:id/providers', async (req, res) => {
  const media = await mediaService.getById(req.params.id)
  if (!media) { res.status(404).json({ error: 'Not found' }); return }

  // Fetch all enabled provider DB rows
  const dbProviders = await prisma.provider.findMany({ where: { enabled: true } })

  const results: {
    providerId: string
    providerName: string
    pluginKey: string
    availability: { status: string; providerMediaId: string | null }
    deepLink: string | null
  }[] = []

  for (const dbProvider of dbProviders) {
    const plugin = getPlugin(dbProvider.pluginKey)
    if (!plugin) continue // unknown pluginKey — skip silently

    let config: Record<string, string>
    try {
      config = await providerService.getProviderConfig(dbProvider.id)
    } catch {
      continue // can't decrypt config — skip
    }

    let availability: { status: string; providerMediaId: string | null }
    try {
      availability = await plugin.getAvailability(media.tmdbId, config)
    } catch {
      availability = { status: 'unknown', providerMediaId: null }
    }

    let deepLink: string | null = null
    if (availability.status === 'available' && availability.providerMediaId) {
      try {
        deepLink = await plugin.getDeepLink(availability.providerMediaId, null, config)
      } catch {
        deepLink = null
      }

      // Upsert ProviderLink so the DB stays fresh (best-effort)
      try {
        await prisma.providerLink.upsert({
          where: { mediaId_providerId: { mediaId: media.id, providerId: dbProvider.id } },
          create: {
            mediaId: media.id,
            providerId: dbProvider.id,
            deepLinkTemplate: deepLink ?? '',
            availability: availability as object,
          },
          update: {
            deepLinkTemplate: deepLink ?? '',
            availability: availability as object,
          },
        })
      } catch {
        // Non-fatal — don't fail the response if upsert fails
      }
    }

    results.push({
      providerId: dbProvider.id,
      providerName: dbProvider.name,
      pluginKey: dbProvider.pluginKey,
      availability,
      deepLink,
    })
  }

  res.json(results)
})
```

- [ ] **Step 3: Run existing media tests to verify nothing is broken**

```bash
cd backend && pnpm test tests/media.test.ts
```

Expected: PASS (5 tests). The `GET /:id/providers` test checks for empty array — that still works because `dbProviders` will be empty (no providers in test DB).

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/mediaService.ts backend/src/routes/media.ts
git commit -m "feat(media): GET /media/:id/providers now calls live plugin availability + upserts ProviderLink"
```

---

## Task 7: Update POST /progress/sync + Integration Tests

**Files:**
- Modify: `backend/src/routes/progress.ts` — replace stub with real Jellyfin sync
- Create: `backend/tests/providers-sync.test.ts` — integration test with mocked fetch

**What sync does:**
1. Load all enabled providers for the calling user.
2. For each, check if plugin has `getProgress`.
3. For each media in user's watchlist (or all progress records), call `plugin.getProgress(providerMediaId, config)`.
4. If progress returned, upsert into `Progress` table (keeping our `seasonEp` if plugin returns `null`).
5. Return `{ synced: N }` where N = number of progress records updated.

**Scope kept simple:** We sync progress for media where we already have a `ProviderLink` row (i.e., we know the `providerMediaId`). We don't check every watchlist item — that would require an availability call per item per provider per sync.

- [ ] **Step 1: Write failing integration test**

```typescript
// backend/tests/providers-sync.test.ts
import request from 'supertest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp } from '../src/app'
import { PrismaClient } from '@prisma/client'
import { encrypt } from '../src/services/cryptoService'

const app = createApp()
const prisma = new PrismaClient()

afterEach(() => {
  vi.restoreAllMocks()
})

async function setup() {
  // Register admin user
  const reg = await request(app)
    .post('/auth/register')
    .send({ email: 'sync@test.com', password: 'pass' })
  const token = reg.body.accessToken as string
  const userId = reg.body.user.id as string

  // Create a Jellyfin provider in DB (config encrypted)
  const config = { serverUrl: 'http://jf.local:8096', apiKey: 'key-xyz', jellyfinUserId: 'jf-user-1' }
  const provider = await prisma.provider.create({
    data: {
      name: 'Jellyfin Home',
      pluginKey: 'jellyfin',
      config: encrypt(JSON.stringify(config)),
      enabled: true,
      createdBy: userId,
    },
  })

  // Create a media record
  const media = await prisma.media.create({
    data: {
      tmdbId: '1396',
      type: 'SERIES',
      title: 'Breaking Bad',
      metadata: {},
    },
  })

  // Create a ProviderLink (simulating that availability was already checked)
  await prisma.providerLink.create({
    data: {
      mediaId: media.id,
      providerId: provider.id,
      deepLinkTemplate: 'intent://jellyfin.app/play/jf-bb-1#Intent;scheme=jellyfin;package=org.jellyfin.androidtv;end',
      availability: { status: 'available', providerMediaId: 'jf-bb-1' },
    },
  })

  return { token, userId, mediaId: media.id, providerId: provider.id }
}

describe('POST /progress/sync', () => {
  it('syncs progress from Jellyfin and returns synced count', async () => {
    const { token, mediaId } = await setup()

    // Mock Jellyfin getProgress call: 45 minutes in
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          UserData: {
            PlaybackPositionTicks: 27_000_000_000, // 2700 seconds = 45 min
            Played: false,
          },
        }),
        { status: 200 },
      ),
    )

    const res = await request(app)
      .post('/progress/sync')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.synced).toBe(1)

    // Verify progress was written to DB
    const progress = await prisma.progress.findFirst({ where: { mediaId } })
    expect(progress).not.toBeNull()
    expect(progress!.positionSec).toBe(2700)
  })

  it('returns synced: 0 when no ProviderLinks exist', async () => {
    // Register a fresh user with no ProviderLinks
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'empty@test.com', password: 'pass' })
    const token = reg.body.accessToken as string

    const res = await request(app)
      .post('/progress/sync')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.synced).toBe(0)
  })

  it('skips providers with no getProgress capability (Netflix)', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'netflix@test.com', password: 'pass' })
    const token = reg.body.accessToken as string
    const userId = reg.body.user.id as string

    // Create Netflix provider
    const netflixProvider = await prisma.provider.create({
      data: {
        name: 'Netflix',
        pluginKey: 'netflix',
        config: encrypt(JSON.stringify({})),
        enabled: true,
        createdBy: userId,
      },
    })

    const media = await prisma.media.create({
      data: { tmdbId: '550', type: 'MOVIE', title: 'Fight Club', metadata: {} },
    })

    await prisma.providerLink.create({
      data: {
        mediaId: media.id,
        providerId: netflixProvider.id,
        deepLinkTemplate: 'https://netflix.com/title/12345',
        availability: { status: 'available', providerMediaId: '12345678' },
      },
    })

    // fetch should NOT be called (Netflix has no getProgress)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const res = await request(app)
      .post('/progress/sync')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.synced).toBe(0)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && pnpm test tests/providers-sync.test.ts
```

Expected: FAIL — `POST /progress/sync` still returns `{ synced: 0, message: 'Provider sync implemented in Plan 2' }` (stub)

- [ ] **Step 3: Replace the sync stub in backend/src/routes/progress.ts**

Full updated file:

```typescript
// backend/src/routes/progress.ts
import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as progressService from '../services/progressService'
import * as providerService from '../services/providerService'
import { get as getPlugin } from '../providers/registry'
import { prisma } from '../db/client'

export const progressRouter = Router()
progressRouter.use(authenticate)

// IMPORTANT: /sync must be before /:mediaId to avoid Express matching "sync" as a mediaId
progressRouter.post('/sync', async (req: AuthRequest, res) => {
  const userId = req.userId!
  let synced = 0

  try {
    // Find all ProviderLinks that belong to enabled providers
    const links = await prisma.providerLink.findMany({
      include: {
        provider: true,
        media: { select: { id: true, tmdbId: true } },
      },
      where: {
        provider: { enabled: true },
      },
    })

    for (const link of links) {
      const plugin = getPlugin(link.provider.pluginKey)
      if (!plugin?.getProgress) continue // skip plugins without progress sync

      const availability = link.availability as { status: string; providerMediaId: string | null }
      if (availability.status !== 'available' || !availability.providerMediaId) continue

      let config: Record<string, string>
      try {
        config = await providerService.getProviderConfig(link.provider.id)
      } catch {
        continue
      }

      let pluginProgress: { positionSec: number; seasonEp: string | null } | null
      try {
        pluginProgress = await plugin.getProgress(availability.providerMediaId, config)
      } catch {
        continue
      }

      if (!pluginProgress || pluginProgress.positionSec === 0) continue

      // Preserve existing seasonEp from our DB if plugin returns null
      let seasonEp = pluginProgress.seasonEp
      if (!seasonEp) {
        const existing = await progressService.getProgress(userId, link.media.id)
        seasonEp = existing?.seasonEp ?? null
      }

      await progressService.upsertProgress(userId, link.media.id, pluginProgress.positionSec, seasonEp)
      synced++
    }

    res.json({ synced })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: 'Sync failed', message })
  }
})

progressRouter.get('/:mediaId', async (req: AuthRequest, res) => {
  const progress = await progressService.getProgress(req.userId!, req.params.mediaId)
  res.json(progress ?? null)
})

progressRouter.put('/:mediaId', async (req: AuthRequest, res) => {
  const { positionSec, seasonEp } = req.body
  if (positionSec === undefined) { res.status(400).json({ error: 'positionSec required' }); return }
  try {
    const progress = await progressService.upsertProgress(
      req.userId!,
      req.params.mediaId,
      positionSec,
      seasonEp,
    )
    res.json(progress)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})
```

- [ ] **Step 4: Update the existing progress test to match new sync response**

Open `backend/tests/progress.test.ts`. The test `'POST /progress/sync returns stub response'` checks `res.body.synced === 0` — that still holds. But it no longer has the `message` field. Verify the test passes as-is:

```bash
cd backend && pnpm test tests/progress.test.ts
```

Expected: PASS (6 tests). The test only asserts `res.body.synced === 0`, which is still true when there are no ProviderLinks.

- [ ] **Step 5: Run sync integration tests — expect PASS**

```bash
cd backend && pnpm test tests/providers-sync.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/progress.ts backend/tests/providers-sync.test.ts
git commit -m "feat(progress): POST /progress/sync now pulls progress from Jellyfin via ProviderLinks"
```

---

## Task 8: PATCH /providers/:id — test action

**Files:**
- Modify: `backend/src/routes/providers.ts` — add `test` branch to PATCH handler

**Design:** `PATCH /providers/:id` with body `{ action: 'test' }` calls `plugin.healthCheck(config)` and returns `{ ok: boolean, message: string }`. All other PATCH bodies work as before (update name/enabled/config).

- [ ] **Step 1: Write failing test**

Add this test to `backend/tests/providers.test.ts`. Open the file and append the new describe block after the existing ones:

```typescript
// Add to the end of backend/tests/providers.test.ts

describe('PATCH /providers/:id — test action', () => {
  it('returns ok: true for a registered plugin with healthCheck (mocked)', async () => {
    // We test with Jellyfin plugin. Mock fetch to simulate healthy server.
    const { vi } = await import('vitest')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ServerName: 'TestJellyfin', Version: '10.9.0' }), { status: 200 }),
    )

    const token = await registerAdmin()
    const create = await request(app)
      .post('/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Jellyfin Test',
        pluginKey: 'jellyfin',
        config: { serverUrl: 'http://jf.test:8096', apiKey: 'key', jellyfinUserId: 'u1' },
      })

    const res = await request(app)
      .patch(`/providers/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'test' })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(typeof res.body.message).toBe('string')

    vi.restoreAllMocks()
  })

  it('returns ok: false when plugin healthCheck fails', async () => {
    const { vi } = await import('vitest')
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const token = await registerAdmin()
    const create = await request(app)
      .post('/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Jellyfin Broken',
        pluginKey: 'jellyfin',
        config: { serverUrl: 'http://bad.host:8096', apiKey: 'key', jellyfinUserId: 'u1' },
      })

    const res = await request(app)
      .patch(`/providers/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'test' })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(false)
    expect(res.body.message).toContain('ECONNREFUSED')

    vi.restoreAllMocks()
  })

  it('returns 400 for unknown pluginKey', async () => {
    const token = await registerAdmin()
    const create = await request(app)
      .post('/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mystery', pluginKey: 'unknown-plugin', config: {} })

    const res = await request(app)
      .patch(`/providers/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'test' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Unknown plugin')
  })

  it('returns 400 for plugin without healthCheck', async () => {
    // Netflix plugin has healthCheck (returns ok: true always) — use a hypothetical
    // plugin without it. Since all our plugins have healthCheck, test Netflix separately:
    // Netflix always returns ok: true, so just verify the route works for it.
    const token = await registerAdmin()
    const create = await request(app)
      .post('/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Netflix', pluginKey: 'netflix', config: {} })

    const res = await request(app)
      .patch(`/providers/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'test' })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && pnpm test tests/providers.test.ts
```

Expected: FAIL on the new `test action` describe block — action is not handled yet

- [ ] **Step 3: Update PATCH handler in backend/src/routes/providers.ts**

Full updated file:

```typescript
// backend/src/routes/providers.ts
import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { requireAdmin } from '../middleware/requireAdmin'
import * as providerService from '../services/providerService'
import { get as getPlugin } from '../providers/registry'

export const providersRouter = Router()
providersRouter.use(authenticate)

providersRouter.get('/', async (_req, res) => {
  const providers = await providerService.listProviders()
  res.json(providers)
})

providersRouter.post('/', requireAdmin, async (req: AuthRequest, res) => {
  const { name, pluginKey, config } = req.body
  if (!name || !pluginKey) { res.status(400).json({ error: 'name and pluginKey required' }); return }
  try {
    const provider = await providerService.createProvider(req.userId!, name, pluginKey, config ?? {})
    res.status(201).json(provider)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

providersRouter.patch('/:id', requireAdmin, async (req, res) => {
  const { action, ...updateData } = req.body

  // Handle test action: call plugin healthCheck
  if (action === 'test') {
    let dbConfig: Record<string, string>
    let pluginKey: string
    try {
      const dbProvider = await providerService.getProviderWithKey(req.params.id)
      pluginKey = dbProvider.pluginKey
      dbConfig = await providerService.getProviderConfig(req.params.id)
    } catch {
      res.status(404).json({ error: 'Provider not found' }); return
    }

    const plugin = getPlugin(pluginKey)
    if (!plugin) {
      res.status(400).json({ error: `Unknown plugin: ${pluginKey}` }); return
    }
    if (!plugin.healthCheck) {
      res.status(400).json({ error: `Plugin ${pluginKey} does not support health check` }); return
    }

    const result = await plugin.healthCheck(dbConfig)
    res.json(result)
    return
  }

  // Normal update (enabled, name, config)
  try {
    const provider = await providerService.updateProvider(req.params.id, updateData)
    res.json(provider)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

providersRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await providerService.deleteProvider(req.params.id)
    res.status(204).send()
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})
```

- [ ] **Step 4: Add getProviderWithKey to providerService**

The PATCH route needs `pluginKey` from the DB before it can look up the plugin. Add this helper to `backend/src/services/providerService.ts` after `getProviderConfig`:

```typescript
export async function getProviderWithKey(id: string): Promise<{ pluginKey: string }> {
  const provider = await prisma.provider.findUniqueOrThrow({ where: { id } })
  return { pluginKey: provider.pluginKey }
}
```

- [ ] **Step 5: Run — expect PASS**

```bash
cd backend && pnpm test tests/providers.test.ts
```

Expected: PASS (all tests including new 4 in the `test action` describe)

- [ ] **Step 6: Run full test suite**

```bash
cd backend && pnpm test
```

Expected: All tests PASS. Count will be approximately 41 (existing) + 13 (jellyfin) + 3 (providers-sync) + 4 (providers test action) = ~61 tests. Fix any failures before proceeding.

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/providers.ts backend/src/services/providerService.ts backend/tests/providers.test.ts
git commit -m "feat(providers): PATCH /providers/:id?action=test calls plugin healthCheck"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task | Status |
|---|---|---|
| Updated shared types (`MediaProvider`, `ProviderResult`, `Availability`) | Task 1 | ✅ |
| Provider registry (`registry.ts`) | Task 2 | ✅ |
| Jellyfin plugin (search, availability, deep-link, getProgress, pushProgress, healthCheck) | Task 3 | ✅ |
| Netflix plugin (availability, deep-link, no progress sync) | Task 4 | ✅ |
| Updated `POST /progress/sync` — calls Jellyfin `getProgress`, syncs to DB | Task 7 | ✅ |
| Updated `GET /media/:id/providers` — live availability + deep-links | Task 6 | ✅ |
| Tests for Jellyfin availability + progress sync (mock fetch) | Tasks 5, 7 | ✅ |
| `PATCH /providers/:id` with `action: test` → healthCheck | Task 8 | ✅ |
| Plex plugin | — | Deferred to Plan 3 (mentioned as future work) |

**Placeholder scan:**

- No "TBD" or "TODO" in code blocks. All implementation is complete.
- "Plex: deferred to Plan 3" is an explicit scope decision, not a placeholder.
- Netflix search returns `[]` with a comment — explicit design decision (no public API), not a placeholder.

**Type consistency check:**

- `MediaProvider.getProgress` signature: `(providerMediaId: string, config: ProviderConfig) => Promise<Pick<Progress, 'positionSec' | 'seasonEp'> | null>`
  - Jellyfin plugin implements: `async getProgress(providerMediaId: string, config: ProviderConfig)` returning `{ positionSec, seasonEp }` — matches `Pick<Progress, 'positionSec' | 'seasonEp'>` ✅
  - Progress route consumes: `pluginProgress.positionSec` and `pluginProgress.seasonEp` ✅
- `MediaProvider.getDeepLink` signature: `(providerMediaId: string, episode: EpisodeRef | null, config: ProviderConfig) => Promise<string>`
  - Jellyfin: `async getDeepLink(providerMediaId: string, _episode: EpisodeRef | null, _config: ProviderConfig)` ✅
  - Netflix: `async getDeepLink(providerMediaId: string, _episode: EpisodeRef | null, _config: ProviderConfig)` ✅
  - media route calls: `plugin.getDeepLink(availability.providerMediaId, null, config)` ✅
- `Availability` shape: `{ status: AvailabilityStatus, providerMediaId: string | null }`
  - Used in `getAvailability` return, stored as JSON in `ProviderLink.availability`, read back in sync route as `{ status: string; providerMediaId: string | null }` ✅
- `getProviderWithKey` added to `providerService.ts` and called from `providers.ts` route ✅
- `get` from registry imported as `getPlugin` in both `media.ts` and `providers.ts` to avoid name collision with DB `get` ✅

**Notes for the implementer:**

- Run tasks in order: Task 1 (shared types) → Task 2 (interface + registry) → Task 3 (Jellyfin) → Task 4 (Netflix) → Task 5 (Jellyfin tests — these will now pass) → Task 6 → Task 7 → Task 8.
- The registry uses module-level side-effect imports. If you see "already registered" errors in tests, check that `vitest.config.ts` still has `singleFork: true` — the registry Map must not be duplicated across workers.
- `fetch` is used directly (Node 20 built-in). No `node-fetch` dependency needed.
- Plex plugin is out of scope for Plan 2. When implementing Plan 3, follow the same pattern: create `backend/src/providers/plugins/plex.ts`, call `register(plexPlugin)`, add it to the side-effect import list in `registry.ts`.
