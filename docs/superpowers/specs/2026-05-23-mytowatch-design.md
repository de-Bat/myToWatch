# myToWatch — Design Spec
**Date:** 2026-05-23  
**Status:** Approved

---

## Overview

Cross-platform watchlist manager for movies and TV series. Users add media from configured providers, track watch progress, and launch playback via deep-link into provider apps. Multi-user with role management. Self-hosted backend.

**Platforms:** iOS, Android TV, Web Desktop  
**Stack:** Expo (React Native) + Node/Express + Prisma + Postgres  
**Design system:** Nocturne Cinema (dark cinematic, glassmorphism, purple accents)

---

## 1. Architecture

```
myToWatch/
├── apps/
│   ├── mobile/          ← Expo SDK 52 (iOS + Android TV)
│   └── web/             ← Expo Web (same codebase, responsive)
├── backend/
│   ├── src/
│   │   ├── routes/      ← Express routers
│   │   ├── services/    ← business logic
│   │   ├── providers/   ← plugin registry + built-ins
│   │   └── db/          ← Prisma schema + migrations
│   └── docker-compose.yml
└── packages/
    └── shared/          ← TS types, provider interface, utils
```

**Data flow:**
1. App authenticates → JWT stored securely on device
2. User searches/browses → app calls backend `/media/search`
3. Backend queries TMDB + IMDB, merges with provider availability
4. User adds to watchlist → stored in Postgres per-user
5. User hits Play → backend returns deep-link URL → app opens provider app at specific media

**Platform constraints:**
- Android TV: D-pad navigation, focus ring system, large-text layout, overscan-safe margins, side nav
- Web desktop: keyboard + mouse, sidebar nav, hover states, 4–6 column grid
- iOS: touch, bottom tab nav, portrait-primary, swipe gestures

---

## 2. Data Model

```prisma
model User {
  id           String          @id @default(cuid())
  email        String          @unique
  passwordHash String
  role         Role            @default(VIEWER)
  createdAt    DateTime        @default(now())
  watchlist    WatchlistItem[]
  progress     Progress[]
}

model WatchlistItem {
  id       String          @id @default(cuid())
  userId   String
  mediaId  String
  status   WatchStatus     @default(PLAN)
  addedAt  DateTime        @default(now())
  user     User            @relation(fields: [userId], references: [id])
  media    Media           @relation(fields: [mediaId], references: [id])
}

model Progress {
  id          String   @id @default(cuid())
  userId      String
  mediaId     String
  seasonEp    String?  // e.g. "S02E04" — null for movies
  positionSec Int      @default(0)
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id])
  media       Media    @relation(fields: [mediaId], references: [id])
}

model Media {
  id       String          @id @default(cuid())
  tmdbId   String          @unique
  imdbId   String?
  type     MediaType
  title    String
  poster   String?
  metadata Json            // synopsis, ratings, cast, genres, year
  links    ProviderLink[]
  watchlist WatchlistItem[]
  progress  Progress[]
}

model Provider {
  id        String         @id @default(cuid())
  name      String
  pluginKey String
  config    String         // AES-256 encrypted JSON
  enabled   Boolean        @default(true)
  createdBy String
  links     ProviderLink[]
}

model ProviderLink {
  id               String   @id @default(cuid())
  mediaId          String
  providerId       String
  deepLinkTemplate String
  availability     Json
  media            Media    @relation(fields: [mediaId], references: [id])
  provider         Provider @relation(fields: [providerId], references: [id])
}

enum Role        { ADMIN VIEWER }
enum WatchStatus { PLAN WATCHING DONE }
enum MediaType   { MOVIE SERIES }
```

---

## 3. Provider Plugin System

Each provider implements:

```ts
interface MediaProvider {
  key: string
  name: string
  configSchema: JSONSchema
  search(query: string, config: ProviderConfig): Promise<ProviderResult[]>
  getAvailability(tmdbId: string, config: ProviderConfig): Promise<Availability>
  getDeepLink(mediaId: string, episode: EpisodeRef | null, config: ProviderConfig): Promise<string>
  getProgress?(userId: string, mediaId: string, config: ProviderConfig): Promise<Progress | null>
  pushProgress?(userId: string, progress: Progress, config: ProviderConfig): Promise<void>
}
```

**Built-in plugins:**

| Plugin     | Config needed          | Deep-link to specific media | Progress sync |
|------------|------------------------|-----------------------------|---------------|
| Jellyfin   | server URL + API key   | ✅ via item ID               | ✅ full API   |
| Plex       | server URL + token     | ✅ via ratingKey             | ✅ full API   |
| Netflix    | none                   | ✅ `nflx://` + title ID      | ❌ manual     |
| Disney+    | none                   | ✅ `disneyplus://` scheme    | ❌ manual     |
| Apple TV+  | none                   | ✅ `videos://` scheme        | ❌ manual     |
| Amazon Prime | none                 | ✅ `aiv://` scheme           | ❌ manual     |

**Progress sync strategy:**
- Jellyfin/Plex: background job polls every 5 min while user active; syncs to DB
- Streaming services: user manually marks progress via "mark episode watched" in app
- On app open: pull latest progress from all capable providers

**User-added plugins:** Admin pastes plugin JS bundle URL → backend fetches, sandboxes in Node `vm` module (no arbitrary FS/network — all external calls must go through the approved provider interface methods), registers. Unverified plugins flagged in UI. Sandboxing is best-effort in v1; treat user-added plugins as trusted-admin-only.

**Shared type `EpisodeRef`** (in `packages/shared`):
```ts
interface EpisodeRef { season: number; episode: number }
```

---

## 4. API Routes

```
Auth
  POST /auth/register
  POST /auth/login
  POST /auth/refresh

Media
  GET  /media/search?q=&type=
  GET  /media/:id              ← merged TMDB+IMDB metadata
  GET  /media/:id/providers    ← available providers + deep-links

Watchlist (per authenticated user)
  GET    /watchlist
  POST   /watchlist
  PATCH  /watchlist/:id
  DELETE /watchlist/:id

Progress
  GET  /progress/:mediaId
  PUT  /progress/:mediaId      ← upsert position/episode
  POST /progress/sync          ← pull from capable providers

Providers (ADMIN only)
  GET    /providers
  POST   /providers
  PATCH  /providers/:id
  DELETE /providers/:id

Users (ADMIN only)
  GET    /users
  PATCH  /users/:id/role
  DELETE /users/:id
```

All routes require JWT. ADMIN-only routes return 403 for VIEWER role.

---

## 5. Frontend Screens

```
Home/Dashboard
  ├── Continue Watching row (progress > 0)
  ├── My Watchlist grid
  └── Recently Added row

Search
  ├── Search bar + results grid
  └── Media Detail sheet
       ├── Poster, title, rating, synopsis
       ├── Cast, genres, year
       ├── Provider chips (available on...)
       ├── Progress bar (if started)
       ├── Add to Watchlist / Mark Watched buttons
       └── Play → deep-link to provider app at specific media

Settings — ADMIN
  ├── Providers
  │    ├── List + enable/disable
  │    ├── Add/configure (form from configSchema)
  │    └── Test connection
  └── Users
       ├── List users
       ├── Change role
       └── Delete user

Profile — per user
  ├── Watch history
  ├── Stats (count, hours)
  └── Manual sync trigger
```

**Platform-specific nav:**
- Android TV: side nav, D-pad focus, overscan margins, no hover
- iOS: bottom tab nav, swipe gestures
- Web: sidebar nav, hover states, keyboard shortcuts

---

## 6. Docker + Deployment

```yaml
services:
  api:
    build: ./backend
    ports: ["3000:3000"]
    environment:
      DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, TMDB_API_KEY, PORT
    depends_on: [db]
    volumes: ["./data/plugins:/app/plugins"]

  db:
    image: postgres:16-alpine
    volumes: ["pgdata:/var/lib/postgresql/data"]

  web:
    build: ./apps/web
    ports: ["8080:8080"]
    environment: [API_URL]
```

**Mobile:** Expo app (App Store / Play Store / side-load). Server URL configured on first launch.

**First-run flow:**
1. App asks for server URL → validates connection
2. Shows login screen
3. First registrant auto-promoted to ADMIN

**Security:**
- JWT: 15min access token + 30d refresh token
- Provider configs: AES-256 encrypted in DB
- Plugin sandbox: Node `vm` module, no FS/network outside provider interface
- Passwords: bcrypt hashed

---

## 7. Metadata Strategy

- **Primary:** TMDB API — poster, synopsis, cast, genres, ratings, episode data
- **Supplement:** IMDB — fetch ratings (IMDB score) via `imdb-api` or scrape ratings page; not full metadata replacement
- **Cache:** Media metadata cached in Postgres `Media.metadata` JSON — refreshed weekly
- **Provider availability:** queried live per provider when media detail opened
