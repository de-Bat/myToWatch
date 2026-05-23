# myToWatch — Plan 1: Monorepo Scaffold + Backend Core

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Turborepo monorepo and implement the complete backend — auth, media search/metadata (TMDB+IMDB), watchlist, progress, provider CRUD, user management — with Postgres via Prisma, all route-tested with Vitest + Supertest.

**Architecture:** Turborepo monorepo. `packages/shared` exports shared TypeScript types. `backend` is Node/Express/Prisma with service-layer pattern (thin routes, logic in services). Tests use a real Postgres test database seeded via `prisma migrate deploy`.

**Tech Stack:** Node 20, TypeScript 5, Express 4, Prisma 5 (Postgres 16), Vitest, Supertest, bcryptjs, jsonwebtoken, node-fetch, dotenv, pnpm workspaces, Turborepo

---

## File Map

**Root:**
- `package.json` — pnpm workspace root
- `pnpm-workspace.yaml`
- `turbo.json`
- `.gitignore`
- `docker-compose.yml` — full production stack

**packages/shared:**
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts`
- `packages/shared/src/types/user.ts`
- `packages/shared/src/types/media.ts`
- `packages/shared/src/types/watchlist.ts`
- `packages/shared/src/types/progress.ts`
- `packages/shared/src/types/provider.ts`

**backend:**
- `backend/package.json`
- `backend/tsconfig.json`
- `backend/.env.example`
- `backend/vitest.config.ts`
- `backend/Dockerfile`
- `backend/docker-compose.yml` — local dev Postgres
- `backend/init-test-db.sql`
- `backend/prisma/schema.prisma`
- `backend/src/config.ts`
- `backend/src/app.ts`
- `backend/src/index.ts`
- `backend/src/db/client.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/middleware/requireAdmin.ts`
- `backend/src/services/cryptoService.ts`
- `backend/src/services/authService.ts`
- `backend/src/services/mediaService.ts`
- `backend/src/services/watchlistService.ts`
- `backend/src/services/progressService.ts`
- `backend/src/services/providerService.ts`
- `backend/src/services/userService.ts`
- `backend/src/routes/auth.ts`
- `backend/src/routes/media.ts`
- `backend/src/routes/watchlist.ts`
- `backend/src/routes/progress.ts`
- `backend/src/routes/providers.ts`
- `backend/src/routes/users.ts`
- `backend/tests/setup.ts`
- `backend/tests/cryptoService.test.ts`
- `backend/tests/auth.test.ts`
- `backend/tests/watchlist.test.ts`
- `backend/tests/progress.test.ts`
- `backend/tests/providers.test.ts`
- `backend/tests/users.test.ts`
- `backend/tests/media.test.ts`

---

## Task 1: Monorepo Root Scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "mytowatch",
  "private": true,
  "version": "0.0.1",
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

Save to: `package.json`

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - 'backend'
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "env": ["DATABASE_URL", "TEST_DATABASE_URL"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.env
.env.local
*.db
pgdata/
data/
```

- [ ] **Step 5: Install and verify**

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` created, no errors.

- [ ] **Step 6: Initialize git and commit**

```bash
git init
git add package.json pnpm-workspace.yaml turbo.json .gitignore
git commit -m "chore: initialize monorepo with pnpm workspaces + turborepo"
```

---

## Task 2: Shared Package — TypeScript Types

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/types/user.ts`
- Create: `packages/shared/src/types/media.ts`
- Create: `packages/shared/src/types/watchlist.ts`
- Create: `packages/shared/src/types/progress.ts`
- Create: `packages/shared/src/types/provider.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@mytowatch/shared",
  "version": "0.0.1",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create packages/shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/shared/src/types/user.ts**

```typescript
export type Role = 'ADMIN' | 'VIEWER'

export interface User {
  id: string
  email: string
  role: Role
  createdAt: Date
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}
```

- [ ] **Step 4: Create packages/shared/src/types/media.ts**

```typescript
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
```

- [ ] **Step 5: Create packages/shared/src/types/watchlist.ts**

```typescript
export type WatchStatus = 'PLAN' | 'WATCHING' | 'DONE'

export interface WatchlistItem {
  id: string
  userId: string
  mediaId: string
  status: WatchStatus
  addedAt: Date
  media?: import('./media').Media
}
```

- [ ] **Step 6: Create packages/shared/src/types/progress.ts**

```typescript
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
```

- [ ] **Step 7: Create packages/shared/src/types/provider.ts**

```typescript
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
```

- [ ] **Step 8: Create packages/shared/src/index.ts**

```typescript
export * from './types/user'
export * from './types/media'
export * from './types/watchlist'
export * from './types/progress'
export * from './types/provider'
```

- [ ] **Step 9: Build shared package**

```bash
cd packages/shared && pnpm build
```

Expected: `dist/` created with `.js` and `.d.ts` files. No TypeScript errors.

- [ ] **Step 10: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared TypeScript types package"
```

---

## Task 3: Backend Scaffold

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env.example`
- Create: `backend/src/config.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/index.ts`

- [ ] **Step 1: Create backend/package.json**

```json
{
  "name": "@mytowatch/backend",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate deploy",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@mytowatch/shared": "workspace:*",
    "@prisma/client": "^5.14.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.0.0",
    "@types/supertest": "^6.0.2",
    "prisma": "^5.14.0",
    "supertest": "^7.0.0",
    "tsx": "^4.11.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create backend/.env.example**

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mytowatch"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mytowatch_test"
JWT_SECRET="change-me-in-production-32-chars-min"
JWT_REFRESH_SECRET="change-me-refresh-32-chars-min!!"
ENCRYPTION_KEY="change-me-encryption-32-chars!!!"
TMDB_API_KEY="your-tmdb-api-key"
PORT=3000
NODE_ENV=development
```

- [ ] **Step 4: Create backend/src/config.ts**

```typescript
import dotenv from 'dotenv'
dotenv.config()

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  encryptionKey: requireEnv('ENCRYPTION_KEY'),
  tmdbApiKey: requireEnv('TMDB_API_KEY'),
  accessTokenTtl: '15m' as const,
  refreshTokenTtl: '30d' as const,
}
```

- [ ] **Step 5: Create backend/src/app.ts**

```typescript
import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth'
import { mediaRouter } from './routes/media'
import { watchlistRouter } from './routes/watchlist'
import { progressRouter } from './routes/progress'
import { providersRouter } from './routes/providers'
import { usersRouter } from './routes/users'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.use('/auth', authRouter)
  app.use('/media', mediaRouter)
  app.use('/watchlist', watchlistRouter)
  app.use('/progress', progressRouter)
  app.use('/providers', providersRouter)
  app.use('/users', usersRouter)

  app.get('/health', (_req, res) => res.json({ ok: true }))

  return app
}
```

- [ ] **Step 6: Create backend/src/index.ts**

```typescript
import { createApp } from './app'
import { config } from './config'

const app = createApp()
app.listen(config.port, () => {
  console.log(`API running on port ${config.port}`)
})
```

- [ ] **Step 7: Install dependencies**

```bash
cd backend && pnpm install
```

Expected: `node_modules` created, no errors.

- [ ] **Step 8: Commit**

```bash
git add backend/
git commit -m "feat: scaffold backend with Express app structure"
```

---

## Task 4: Prisma Schema + DB Setup

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/db/client.ts`
- Create: `backend/docker-compose.yml`
- Create: `backend/init-test-db.sql`
- Create: `backend/vitest.config.ts`
- Create: `backend/tests/setup.ts`

- [ ] **Step 1: Create backend/.env from example and fill in values**

```bash
cp backend/.env.example backend/.env
```

Set these values in `backend/.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mytowatch"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mytowatch_test"
JWT_SECRET="dev-jwt-secret-at-least-32-chars!!"
JWT_REFRESH_SECRET="dev-refresh-secret-at-least-32ch"
ENCRYPTION_KEY="dev-encryption-key-exactly-32ch!"
TMDB_API_KEY="<your key from themoviedb.org — free at https://www.themoviedb.org/settings/api>"
```

- [ ] **Step 2: Create backend/docker-compose.yml**

```yaml
version: '3.9'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mytowatch
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init-test-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

- [ ] **Step 3: Create backend/init-test-db.sql**

```sql
CREATE DATABASE mytowatch_test;
```

- [ ] **Step 4: Start Postgres**

```bash
cd backend && docker compose up -d db
```

Wait ~10 seconds for Postgres to be healthy, then verify:
```bash
docker compose ps
```

Expected: `db` service status `healthy`.

- [ ] **Step 5: Create backend/prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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
  id      String      @id @default(cuid())
  userId  String
  mediaId String
  status  WatchStatus @default(PLAN)
  addedAt DateTime    @default(now())
  user    User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  media   Media       @relation(fields: [mediaId], references: [id])

  @@unique([userId, mediaId])
}

model Progress {
  id          String   @id @default(cuid())
  userId      String
  mediaId     String
  seasonEp    String?
  positionSec Int      @default(0)
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  media       Media    @relation(fields: [mediaId], references: [id])

  @@unique([userId, mediaId])
}

model Media {
  id        String          @id @default(cuid())
  tmdbId    String          @unique
  imdbId    String?
  type      MediaType
  title     String
  poster    String?
  metadata  Json
  links     ProviderLink[]
  watchlist WatchlistItem[]
  progress  Progress[]
}

model Provider {
  id        String         @id @default(cuid())
  name      String
  pluginKey String
  config    String
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

  @@unique([mediaId, providerId])
}

enum Role        { ADMIN VIEWER }
enum WatchStatus { PLAN WATCHING DONE }
enum MediaType   { MOVIE SERIES }
```

- [ ] **Step 6: Run initial migration**

```bash
cd backend && npx prisma migrate dev --name init
```

Expected: Migration file created under `prisma/migrations/`, tables created. No errors.

- [ ] **Step 7: Create backend/src/db/client.ts**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 8: Create backend/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
})
```

- [ ] **Step 9: Create backend/tests/setup.ts**

```typescript
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const testDbUrl = process.env.TEST_DATABASE_URL
if (!testDbUrl) throw new Error('TEST_DATABASE_URL required for tests')

process.env.DATABASE_URL = testDbUrl

const prisma = new PrismaClient()

beforeAll(async () => {
  execSync('npx prisma migrate deploy', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: 'inherit',
  })
})

afterEach(async () => {
  await prisma.providerLink.deleteMany()
  await prisma.progress.deleteMany()
  await prisma.watchlistItem.deleteMany()
  await prisma.media.deleteMany()
  await prisma.provider.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

- [ ] **Step 10: Commit**

```bash
git add backend/prisma backend/src/db backend/tests/setup.ts backend/vitest.config.ts backend/docker-compose.yml backend/init-test-db.sql
git commit -m "feat: Prisma schema, DB client, Vitest test setup"
```

---

## Task 5: Crypto Service

**Files:**
- Create: `backend/src/services/cryptoService.ts`
- Create: `backend/tests/cryptoService.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// backend/tests/cryptoService.test.ts
import { encrypt, decrypt } from '../src/services/cryptoService'

process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!!!'

describe('cryptoService', () => {
  it('encrypts and decrypts round-trip', () => {
    const plaintext = JSON.stringify({ apiKey: 'secret123', url: 'http://example.com' })
    const ciphertext = encrypt(plaintext)
    expect(ciphertext).not.toBe(plaintext)
    expect(decrypt(ciphertext)).toBe(plaintext)
  })

  it('produces different ciphertext each call (random IV)', () => {
    const plaintext = 'same input'
    expect(encrypt(plaintext)).not.toBe(encrypt(plaintext))
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && pnpm test tests/cryptoService.test.ts
```

Expected: FAIL — `Cannot find module '../src/services/cryptoService'`

- [ ] **Step 3: Implement cryptoService**

```typescript
// backend/src/services/cryptoService.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY ?? ''
  if (key.length < 32) throw new Error('ENCRYPTION_KEY must be at least 32 chars')
  return Buffer.from(key.slice(0, 32), 'utf8')
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64')
  const iv = buf.subarray(0, IV_LENGTH)
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd backend && pnpm test tests/cryptoService.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/cryptoService.ts backend/tests/cryptoService.test.ts
git commit -m "feat: AES-256-GCM crypto service for provider config encryption"
```

---

## Task 6: Auth Service + Routes

**Files:**
- Create: `backend/src/services/authService.ts`
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/middleware/requireAdmin.ts`
- Create: `backend/src/routes/auth.ts`
- Create: `backend/tests/auth.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/tests/auth.test.ts
import request from 'supertest'
import { createApp } from '../src/app'

const app = createApp()

describe('POST /auth/register', () => {
  it('creates first user as ADMIN', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'admin@test.com', password: 'password123' })
    expect(res.status).toBe(201)
    expect(res.body.user.role).toBe('ADMIN')
    expect(res.body.user.passwordHash).toBeUndefined()
    expect(res.body.accessToken).toBeDefined()
    expect(res.body.refreshToken).toBeDefined()
  })

  it('creates subsequent users as VIEWER', async () => {
    await request(app).post('/auth/register').send({ email: 'admin@test.com', password: 'pass' })
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'viewer@test.com', password: 'pass' })
    expect(res.status).toBe(201)
    expect(res.body.user.role).toBe('VIEWER')
  })

  it('rejects duplicate email with 409', async () => {
    await request(app).post('/auth/register').send({ email: 'dup@test.com', password: 'pass' })
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'dup@test.com', password: 'pass' })
    expect(res.status).toBe(409)
  })

  it('rejects missing fields with 400', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'x@test.com' })
    expect(res.status).toBe(400)
  })
})

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/auth/register').send({ email: 'user@test.com', password: 'pass123' })
  })

  it('returns tokens on valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'pass123' })
    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
    expect(res.body.refreshToken).toBeDefined()
  })

  it('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('rejects unknown email with 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@test.com', password: 'pass' })
    expect(res.status).toBe(401)
  })
})

describe('POST /auth/refresh', () => {
  it('returns new access token from valid refresh token', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'refresh@test.com', password: 'pass' })
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: reg.body.refreshToken })
    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
  })

  it('rejects invalid refresh token with 401', async () => {
    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'bad-token' })
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && pnpm test tests/auth.test.ts
```

Expected: FAIL — routes not implemented

- [ ] **Step 3: Implement authService**

```typescript
// backend/src/services/authService.ts
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../db/client'
import { config } from '../config'
import type { AuthTokens, User } from '@mytowatch/shared'

export async function register(
  email: string,
  password: string,
): Promise<{ user: User; tokens: AuthTokens }> {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw Object.assign(new Error('Email already registered'), { code: 'DUPLICATE_EMAIL' })

  const userCount = await prisma.user.count()
  const role = userCount === 0 ? ('ADMIN' as const) : ('VIEWER' as const)
  const passwordHash = await bcrypt.hash(password, 12)

  const created = await prisma.user.create({ data: { email, passwordHash, role } })
  const user: User = { id: created.id, email: created.email, role: created.role, createdAt: created.createdAt }
  return { user, tokens: generateTokens(user) }
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: User; tokens: AuthTokens }> {
  const found = await prisma.user.findUnique({ where: { email } })
  if (!found) throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' })

  const valid = await bcrypt.compare(password, found.passwordHash)
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' })

  const user: User = { id: found.id, email: found.email, role: found.role, createdAt: found.createdAt }
  return { user, tokens: generateTokens(user) }
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(refreshToken, config.jwtRefreshSecret) as jwt.JwtPayload
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { code: 'INVALID_TOKEN' })
  }
  const found = await prisma.user.findUnique({ where: { id: payload.sub as string } })
  if (!found) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' })
  const user: User = { id: found.id, email: found.email, role: found.role, createdAt: found.createdAt }
  return generateTokens(user)
}

function generateTokens(user: User): AuthTokens {
  const accessToken = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.accessTokenTtl,
  })
  const refreshToken = jwt.sign({ sub: user.id }, config.jwtRefreshSecret, {
    expiresIn: config.refreshTokenTtl,
  })
  return { accessToken, refreshToken }
}
```

- [ ] **Step 4: Implement auth middleware**

```typescript
// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import type { Role } from '@mytowatch/shared'

export interface AuthRequest extends Request {
  userId?: string
  userRole?: Role
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' })
    return
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as jwt.JwtPayload
    req.userId = payload.sub as string
    req.userRole = payload.role as Role
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
```

- [ ] **Step 5: Implement requireAdmin middleware**

```typescript
// backend/src/middleware/requireAdmin.ts
import { Response, NextFunction } from 'express'
import type { AuthRequest } from './auth'

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'ADMIN') {
    res.status(403).json({ error: 'Admin required' })
    return
  }
  next()
}
```

- [ ] **Step 6: Implement auth routes**

```typescript
// backend/src/routes/auth.ts
import { Router } from 'express'
import * as authService from '../services/authService'

export const authRouter = Router()

authRouter.post('/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) { res.status(400).json({ error: 'email and password required' }); return }
  try {
    const { user, tokens } = await authService.register(email, password)
    res.status(201).json({ user, ...tokens })
  } catch (err: any) {
    if (err.code === 'DUPLICATE_EMAIL') { res.status(409).json({ error: err.message }); return }
    res.status(500).json({ error: 'Internal server error' })
  }
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) { res.status(400).json({ error: 'email and password required' }); return }
  try {
    const { user, tokens } = await authService.login(email, password)
    res.status(200).json({ user, ...tokens })
  } catch (err: any) {
    if (err.code === 'INVALID_CREDENTIALS') { res.status(401).json({ error: err.message }); return }
    res.status(500).json({ error: 'Internal server error' })
  }
})

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) { res.status(400).json({ error: 'refreshToken required' }); return }
  try {
    const tokens = await authService.refresh(refreshToken)
    res.status(200).json(tokens)
  } catch (err: any) {
    if (err.code === 'INVALID_TOKEN' || err.code === 'NOT_FOUND') {
      res.status(401).json({ error: err.message }); return
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})
```

- [ ] **Step 7: Run — expect PASS**

```bash
cd backend && pnpm test tests/auth.test.ts
```

Expected: PASS (8 tests)

- [ ] **Step 8: Commit**

```bash
git add backend/src/services/authService.ts backend/src/middleware/ backend/src/routes/auth.ts backend/tests/auth.test.ts
git commit -m "feat: auth service — register, login, refresh + JWT middleware"
```

---

## Task 7: Watchlist Service + Routes

**Files:**
- Create: `backend/src/services/watchlistService.ts`
- Create: `backend/src/routes/watchlist.ts`
- Create: `backend/tests/watchlist.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/tests/watchlist.test.ts
import request from 'supertest'
import { createApp } from '../src/app'
import { PrismaClient } from '@prisma/client'

const app = createApp()
const prisma = new PrismaClient()

async function registerAndGetToken(email = 'wl@test.com') {
  const res = await request(app).post('/auth/register').send({ email, password: 'pass' })
  return res.body.accessToken as string
}

async function createMedia() {
  return prisma.media.create({
    data: {
      tmdbId: 'tmdb-wl-1',
      type: 'MOVIE',
      title: 'Test Movie',
      metadata: {
        synopsis: '', rating: 7, imdbRating: null,
        genres: [], cast: [], year: 2024, runtime: 120, episodeCount: null,
      },
    },
  })
}

describe('Watchlist', () => {
  it('GET /watchlist returns empty list initially', async () => {
    const token = await registerAndGetToken()
    const res = await request(app).get('/watchlist').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('POST /watchlist adds item with default status PLAN', async () => {
    const token = await registerAndGetToken()
    const media = await createMedia()
    const res = await request(app)
      .post('/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ mediaId: media.id })
    expect(res.status).toBe(201)
    expect(res.body.mediaId).toBe(media.id)
    expect(res.body.status).toBe('PLAN')
  })

  it('POST /watchlist accepts explicit status', async () => {
    const token = await registerAndGetToken()
    const media = await createMedia()
    const res = await request(app)
      .post('/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ mediaId: media.id, status: 'WATCHING' })
    expect(res.status).toBe(201)
    expect(res.body.status).toBe('WATCHING')
  })

  it('PATCH /watchlist/:id updates status', async () => {
    const token = await registerAndGetToken()
    const media = await createMedia()
    const add = await request(app)
      .post('/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ mediaId: media.id })
    const res = await request(app)
      .patch(`/watchlist/${add.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'DONE' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('DONE')
  })

  it('DELETE /watchlist/:id removes item', async () => {
    const token = await registerAndGetToken()
    const media = await createMedia()
    const add = await request(app)
      .post('/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ mediaId: media.id })
    const del = await request(app)
      .delete(`/watchlist/${add.body.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(del.status).toBe(204)
    const list = await request(app).get('/watchlist').set('Authorization', `Bearer ${token}`)
    expect(list.body).toEqual([])
  })

  it('returns 401 without token', async () => {
    const res = await request(app).get('/watchlist')
    expect(res.status).toBe(401)
  })

  it('returns 400 when mediaId missing', async () => {
    const token = await registerAndGetToken()
    const res = await request(app)
      .post('/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && pnpm test tests/watchlist.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement watchlistService**

```typescript
// backend/src/services/watchlistService.ts
import { prisma } from '../db/client'
import type { WatchStatus } from '@mytowatch/shared'

export async function getWatchlist(userId: string) {
  return prisma.watchlistItem.findMany({
    where: { userId },
    include: { media: true },
    orderBy: { addedAt: 'desc' },
  })
}

export async function addItem(userId: string, mediaId: string, status: WatchStatus = 'PLAN') {
  return prisma.watchlistItem.create({
    data: { userId, mediaId, status },
    include: { media: true },
  })
}

export async function updateItem(id: string, userId: string, status: WatchStatus) {
  const item = await prisma.watchlistItem.findFirst({ where: { id, userId } })
  if (!item) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' })
  return prisma.watchlistItem.update({ where: { id }, data: { status }, include: { media: true } })
}

export async function removeItem(id: string, userId: string) {
  const item = await prisma.watchlistItem.findFirst({ where: { id, userId } })
  if (!item) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' })
  await prisma.watchlistItem.delete({ where: { id } })
}
```

- [ ] **Step 4: Implement watchlist routes**

```typescript
// backend/src/routes/watchlist.ts
import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as watchlistService from '../services/watchlistService'

export const watchlistRouter = Router()
watchlistRouter.use(authenticate)

watchlistRouter.get('/', async (req: AuthRequest, res) => {
  const items = await watchlistService.getWatchlist(req.userId!)
  res.json(items)
})

watchlistRouter.post('/', async (req: AuthRequest, res) => {
  const { mediaId, status } = req.body
  if (!mediaId) { res.status(400).json({ error: 'mediaId required' }); return }
  try {
    const item = await watchlistService.addItem(req.userId!, mediaId, status)
    res.status(201).json(item)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

watchlistRouter.patch('/:id', async (req: AuthRequest, res) => {
  const { status } = req.body
  if (!status) { res.status(400).json({ error: 'status required' }); return }
  try {
    const item = await watchlistService.updateItem(req.params.id, req.userId!, status)
    res.json(item)
  } catch (err: any) {
    if (err.code === 'NOT_FOUND') { res.status(404).json({ error: 'Not found' }); return }
    res.status(500).json({ error: 'Internal server error' })
  }
})

watchlistRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await watchlistService.removeItem(req.params.id, req.userId!)
    res.status(204).send()
  } catch (err: any) {
    if (err.code === 'NOT_FOUND') { res.status(404).json({ error: 'Not found' }); return }
    res.status(500).json({ error: 'Internal server error' })
  }
})
```

- [ ] **Step 5: Run — expect PASS**

```bash
cd backend && pnpm test tests/watchlist.test.ts
```

Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/watchlistService.ts backend/src/routes/watchlist.ts backend/tests/watchlist.test.ts
git commit -m "feat: watchlist service + routes (CRUD per user)"
```

---

## Task 8: Progress Service + Routes

**Files:**
- Create: `backend/src/services/progressService.ts`
- Create: `backend/src/routes/progress.ts`
- Create: `backend/tests/progress.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/tests/progress.test.ts
import request from 'supertest'
import { createApp } from '../src/app'
import { PrismaClient } from '@prisma/client'

const app = createApp()
const prisma = new PrismaClient()

async function registerAndGetToken(email = 'prog@test.com') {
  const res = await request(app).post('/auth/register').send({ email, password: 'pass' })
  return res.body.accessToken as string
}

async function createMedia(tmdbId = 'tmdb-prog-1') {
  return prisma.media.create({
    data: {
      tmdbId,
      type: 'SERIES',
      title: 'Test Series',
      metadata: {
        synopsis: '', rating: 8, imdbRating: 8.2,
        genres: [], cast: [], year: 2023, runtime: null, episodeCount: 24,
      },
    },
  })
}

describe('Progress', () => {
  it('GET /progress/:mediaId returns null when no progress', async () => {
    const token = await registerAndGetToken()
    const media = await createMedia()
    const res = await request(app)
      .get(`/progress/${media.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toBeNull()
  })

  it('PUT /progress/:mediaId creates progress record', async () => {
    const token = await registerAndGetToken()
    const media = await createMedia()
    const res = await request(app)
      .put(`/progress/${media.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ positionSec: 1200, seasonEp: 'S01E03' })
    expect(res.status).toBe(200)
    expect(res.body.positionSec).toBe(1200)
    expect(res.body.seasonEp).toBe('S01E03')
  })

  it('PUT /progress/:mediaId upserts on second call', async () => {
    const token = await registerAndGetToken()
    const media = await createMedia()
    await request(app)
      .put(`/progress/${media.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ positionSec: 600, seasonEp: 'S01E01' })
    const res = await request(app)
      .put(`/progress/${media.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ positionSec: 1800, seasonEp: 'S01E02' })
    expect(res.status).toBe(200)
    expect(res.body.positionSec).toBe(1800)
    expect(res.body.seasonEp).toBe('S01E02')
  })

  it('GET /progress/:mediaId returns updated progress', async () => {
    const token = await registerAndGetToken()
    const media = await createMedia()
    await request(app)
      .put(`/progress/${media.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ positionSec: 500 })
    const res = await request(app)
      .get(`/progress/${media.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.positionSec).toBe(500)
  })

  it('returns 400 when positionSec missing', async () => {
    const token = await registerAndGetToken()
    const media = await createMedia()
    const res = await request(app)
      .put(`/progress/${media.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('POST /progress/sync returns stub response', async () => {
    const token = await registerAndGetToken()
    const res = await request(app)
      .post('/progress/sync')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.synced).toBe(0)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && pnpm test tests/progress.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement progressService**

```typescript
// backend/src/services/progressService.ts
import { prisma } from '../db/client'

export async function getProgress(userId: string, mediaId: string) {
  return prisma.progress.findUnique({
    where: { userId_mediaId: { userId, mediaId } },
  })
}

export async function upsertProgress(
  userId: string,
  mediaId: string,
  positionSec: number,
  seasonEp?: string | null,
) {
  return prisma.progress.upsert({
    where: { userId_mediaId: { userId, mediaId } },
    create: { userId, mediaId, positionSec, seasonEp: seasonEp ?? null },
    update: { positionSec, seasonEp: seasonEp ?? null },
  })
}
```

- [ ] **Step 4: Implement progress routes**

```typescript
// backend/src/routes/progress.ts
import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as progressService from '../services/progressService'

export const progressRouter = Router()
progressRouter.use(authenticate)

progressRouter.post('/sync', async (_req, res) => {
  res.json({ synced: 0, message: 'Provider sync implemented in Plan 2' })
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

Note: `/sync` route must be registered before `/:mediaId` to avoid Express matching "sync" as a mediaId.

- [ ] **Step 5: Run — expect PASS**

```bash
cd backend && pnpm test tests/progress.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/progressService.ts backend/src/routes/progress.ts backend/tests/progress.test.ts
git commit -m "feat: progress service + routes (upsert per user/media)"
```

---

## Task 9: Provider CRUD Service + Routes

**Files:**
- Create: `backend/src/services/providerService.ts`
- Create: `backend/src/routes/providers.ts`
- Create: `backend/tests/providers.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/tests/providers.test.ts
import request from 'supertest'
import { createApp } from '../src/app'

const app = createApp()

async function registerAdmin() {
  const res = await request(app).post('/auth/register').send({ email: 'admin@test.com', password: 'pass' })
  return res.body.accessToken as string
}

async function registerViewer() {
  await request(app).post('/auth/register').send({ email: 'admin@test.com', password: 'pass' })
  const res = await request(app).post('/auth/register').send({ email: 'viewer@test.com', password: 'pass' })
  return res.body.accessToken as string
}

describe('Providers (admin only)', () => {
  it('GET /providers returns empty list initially', async () => {
    const token = await registerAdmin()
    const res = await request(app).get('/providers').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('POST /providers creates provider and strips config from response', async () => {
    const token = await registerAdmin()
    const res = await request(app)
      .post('/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Jellyfin Home', pluginKey: 'jellyfin', config: { url: 'http://localhost:8096', apiKey: 'abc' } })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Jellyfin Home')
    expect(res.body.pluginKey).toBe('jellyfin')
    expect(res.body.config).toBeUndefined()
  })

  it('GET /providers lists created providers', async () => {
    const token = await registerAdmin()
    await request(app)
      .post('/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Jellyfin', pluginKey: 'jellyfin', config: {} })
    const res = await request(app).get('/providers').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.length).toBe(1)
    expect(res.body[0].config).toBeUndefined()
  })

  it('PATCH /providers/:id updates enabled status', async () => {
    const token = await registerAdmin()
    const create = await request(app)
      .post('/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Plex', pluginKey: 'plex', config: {} })
    const res = await request(app)
      .patch(`/providers/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ enabled: false })
    expect(res.status).toBe(200)
    expect(res.body.enabled).toBe(false)
  })

  it('DELETE /providers/:id removes provider', async () => {
    const token = await registerAdmin()
    const create = await request(app)
      .post('/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Netflix', pluginKey: 'netflix', config: {} })
    const res = await request(app)
      .delete(`/providers/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(204)
  })

  it('rejects VIEWER role with 403', async () => {
    const token = await registerViewer()
    const res = await request(app)
      .post('/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', pluginKey: 'test', config: {} })
    expect(res.status).toBe(403)
  })

  it('rejects missing name with 400', async () => {
    const token = await registerAdmin()
    const res = await request(app)
      .post('/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({ pluginKey: 'test' })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && pnpm test tests/providers.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement providerService**

```typescript
// backend/src/services/providerService.ts
import { prisma } from '../db/client'
import { encrypt, decrypt } from './cryptoService'

function stripConfig<T extends { config: string }>(p: T): Omit<T, 'config'> {
  const { config: _, ...safe } = p
  return safe
}

export async function listProviders() {
  const providers = await prisma.provider.findMany({ orderBy: { name: 'asc' } })
  return providers.map(stripConfig)
}

export async function createProvider(
  userId: string,
  name: string,
  pluginKey: string,
  config: Record<string, string>,
) {
  const encryptedConfig = encrypt(JSON.stringify(config))
  const provider = await prisma.provider.create({
    data: { name, pluginKey, config: encryptedConfig, createdBy: userId },
  })
  return stripConfig(provider)
}

export async function updateProvider(
  id: string,
  data: { enabled?: boolean; name?: string; config?: Record<string, string> },
) {
  const update: Record<string, unknown> = {}
  if (data.enabled !== undefined) update.enabled = data.enabled
  if (data.name !== undefined) update.name = data.name
  if (data.config !== undefined) update.config = encrypt(JSON.stringify(data.config))
  const provider = await prisma.provider.update({ where: { id }, data: update })
  return stripConfig(provider)
}

export async function deleteProvider(id: string) {
  await prisma.provider.delete({ where: { id } })
}

export async function getProviderConfig(id: string): Promise<Record<string, string>> {
  const provider = await prisma.provider.findUniqueOrThrow({ where: { id } })
  return JSON.parse(decrypt(provider.config))
}
```

- [ ] **Step 4: Implement providers routes**

```typescript
// backend/src/routes/providers.ts
import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { requireAdmin } from '../middleware/requireAdmin'
import * as providerService from '../services/providerService'

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
  try {
    const provider = await providerService.updateProvider(req.params.id, req.body)
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

- [ ] **Step 5: Run — expect PASS**

```bash
cd backend && pnpm test tests/providers.test.ts
```

Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/providerService.ts backend/src/routes/providers.ts backend/tests/providers.test.ts
git commit -m "feat: providers CRUD service + routes (admin only, config AES-256 encrypted)"
```

---

## Task 10: Users Service + Routes

**Files:**
- Create: `backend/src/services/userService.ts`
- Create: `backend/src/routes/users.ts`
- Create: `backend/tests/users.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/tests/users.test.ts
import request from 'supertest'
import { createApp } from '../src/app'

const app = createApp()

async function setup() {
  const adminRes = await request(app).post('/auth/register').send({ email: 'admin@test.com', password: 'pass' })
  const viewerRes = await request(app).post('/auth/register').send({ email: 'viewer@test.com', password: 'pass' })
  return {
    adminToken: adminRes.body.accessToken as string,
    viewerToken: viewerRes.body.accessToken as string,
    viewerId: viewerRes.body.user.id as string,
  }
}

describe('Users (admin only)', () => {
  it('GET /users lists all users without passwordHash', async () => {
    const { adminToken } = await setup()
    const res = await request(app).get('/users').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.length).toBe(2)
    expect(res.body[0].passwordHash).toBeUndefined()
  })

  it('PATCH /users/:id/role promotes viewer to admin', async () => {
    const { adminToken, viewerId } = await setup()
    const res = await request(app)
      .patch(`/users/${viewerId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'ADMIN' })
    expect(res.status).toBe(200)
    expect(res.body.role).toBe('ADMIN')
  })

  it('DELETE /users/:id removes user', async () => {
    const { adminToken, viewerId } = await setup()
    await request(app).delete(`/users/${viewerId}`).set('Authorization', `Bearer ${adminToken}`)
    const list = await request(app).get('/users').set('Authorization', `Bearer ${adminToken}`)
    expect(list.body.length).toBe(1)
  })

  it('PATCH /users/:id/role rejects invalid role with 400', async () => {
    const { adminToken, viewerId } = await setup()
    const res = await request(app)
      .patch(`/users/${viewerId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'SUPERADMIN' })
    expect(res.status).toBe(400)
  })

  it('rejects VIEWER with 403', async () => {
    const { viewerToken } = await setup()
    const res = await request(app).get('/users').set('Authorization', `Bearer ${viewerToken}`)
    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && pnpm test tests/users.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement userService**

```typescript
// backend/src/services/userService.ts
import { prisma } from '../db/client'
import type { Role } from '@mytowatch/shared'

export async function listUsers() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
  return users.map(({ passwordHash: _, ...u }) => u)
}

export async function setRole(id: string, role: Role) {
  const user = await prisma.user.update({ where: { id }, data: { role } })
  const { passwordHash: _, ...safe } = user
  return safe
}

export async function deleteUser(id: string) {
  await prisma.user.delete({ where: { id } })
}
```

- [ ] **Step 4: Implement users routes**

```typescript
// backend/src/routes/users.ts
import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { requireAdmin } from '../middleware/requireAdmin'
import * as userService from '../services/userService'

export const usersRouter = Router()
usersRouter.use(authenticate, requireAdmin)

usersRouter.get('/', async (_req, res) => {
  const users = await userService.listUsers()
  res.json(users)
})

usersRouter.patch('/:id/role', async (req, res) => {
  const { role } = req.body
  if (role !== 'ADMIN' && role !== 'VIEWER') {
    res.status(400).json({ error: 'role must be ADMIN or VIEWER' }); return
  }
  try {
    const user = await userService.setRole(req.params.id, role)
    res.json(user)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

usersRouter.delete('/:id', async (req, res) => {
  try {
    await userService.deleteUser(req.params.id)
    res.status(204).send()
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})
```

- [ ] **Step 5: Run — expect PASS**

```bash
cd backend && pnpm test tests/users.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/userService.ts backend/src/routes/users.ts backend/tests/users.test.ts
git commit -m "feat: users service + routes (admin: list, change role, delete)"
```

---

## Task 11: Media Service + Routes

**Files:**
- Create: `backend/src/services/mediaService.ts`
- Create: `backend/src/routes/media.ts`
- Create: `backend/tests/media.test.ts`

- [ ] **Step 1: Write failing tests**

Note: Tests mock `searchTmdb` to avoid real HTTP calls.

```typescript
// backend/tests/media.test.ts
import request from 'supertest'
import { createApp } from '../src/app'
import { PrismaClient } from '@prisma/client'
import { vi } from 'vitest'
import type { Media } from '@mytowatch/shared'

const mockSearchResult: Media = {
  id: '',
  tmdbId: '550',
  imdbId: 'tt0137523',
  type: 'MOVIE',
  title: 'Fight Club',
  poster: 'https://image.tmdb.org/t/p/w500/poster.jpg',
  metadata: {
    synopsis: 'An insomniac office worker...',
    rating: 8.4,
    imdbRating: 8.8,
    genres: ['Drama', 'Thriller'],
    cast: ['Brad Pitt', 'Edward Norton'],
    year: 1999,
    runtime: 139,
    episodeCount: null,
  },
}

vi.mock('../src/services/mediaService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/mediaService')>()
  return { ...actual, searchTmdb: vi.fn().mockResolvedValue([mockSearchResult]) }
})

const app = createApp()
const prisma = new PrismaClient()

async function getToken() {
  const res = await request(app).post('/auth/register').send({ email: 'media@test.com', password: 'pass' })
  return res.body.accessToken as string
}

describe('Media routes', () => {
  it('GET /media/search returns results', async () => {
    const token = await getToken()
    const res = await request(app)
      .get('/media/search?q=fight+club')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body[0].title).toBe('Fight Club')
    expect(res.body[0].metadata.imdbRating).toBe(8.8)
  })

  it('GET /media/search requires q param', async () => {
    const token = await getToken()
    const res = await request(app).get('/media/search').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
  })

  it('GET /media/:id returns media by id', async () => {
    const token = await getToken()
    const media = await prisma.media.create({
      data: {
        tmdbId: '550',
        type: 'MOVIE',
        title: 'Fight Club',
        metadata: mockSearchResult.metadata as object,
      },
    })
    const res = await request(app).get(`/media/${media.id}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Fight Club')
  })

  it('GET /media/:id returns 404 for unknown id', async () => {
    const token = await getToken()
    const res = await request(app)
      .get('/media/nonexistent-id')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('GET /media/:id/providers returns empty array when no links', async () => {
    const token = await getToken()
    const media = await prisma.media.create({
      data: { tmdbId: '999', type: 'MOVIE', title: 'No Providers', metadata: {} },
    })
    const res = await request(app)
      .get(`/media/${media.id}/providers`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && pnpm test tests/media.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement mediaService**

```typescript
// backend/src/services/mediaService.ts
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
```

- [ ] **Step 4: Implement media routes**

```typescript
// backend/src/routes/media.ts
import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import * as mediaService from '../services/mediaService'
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
  const providers = await mediaService.getProviders(req.params.id)
  res.json(providers)
})
```

- [ ] **Step 5: Run — expect PASS**

```bash
cd backend && pnpm test tests/media.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 6: Run full test suite**

```bash
cd backend && pnpm test
```

Expected: All tests PASS (≥ 38 tests across all files). Fix any failures before continuing.

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/mediaService.ts backend/src/routes/media.ts backend/tests/media.test.ts
git commit -m "feat: media service + routes (TMDB search, IMDB rating supplement)"
```

---

## Task 12: Production Docker + README

**Files:**
- Create: `backend/Dockerfile`
- Create: `docker-compose.yml` (root)
- Create: `README.md`

- [ ] **Step 1: Create backend/Dockerfile**

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY packages/shared ./packages/shared
COPY backend ./backend
RUN cd packages/shared && pnpm build
RUN cd backend && npx tsc

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

- [ ] **Step 2: Create root docker-compose.yml**

```yaml
version: '3.9'
services:
  api:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/mytowatch
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      TMDB_API_KEY: ${TMDB_API_KEY}
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./data/plugins:/app/plugins

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mytowatch
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

- [ ] **Step 3: Create root README.md**

```markdown
# myToWatch

Cross-platform watchlist manager for movies and TV series. iOS · Android TV · Web Desktop.

## Quick Start (self-hosted)

**Prerequisites:** Docker, Docker Compose

1. Create `.env` in the project root:
   ```
   JWT_SECRET=<32+ random chars>
   JWT_REFRESH_SECRET=<32+ random chars>
   ENCRYPTION_KEY=<exactly 32 chars>
   TMDB_API_KEY=<from themoviedb.org/settings/api>
   ```

2. Start all services:
   ```bash
   docker compose up
   ```

3. API available at `http://localhost:3000`

The first user to register at `POST /auth/register` becomes ADMIN.

## Development

```bash
pnpm install
cd backend && cp .env.example .env   # fill in values
cd backend && docker compose up -d db
cd backend && pnpm dev
```

## Test

```bash
cd backend && pnpm test
```

Requires Postgres running with `TEST_DATABASE_URL` set in `backend/.env`.

## API Reference

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | /auth/register | — | — | Register (first = ADMIN) |
| POST | /auth/login | — | — | Login, get tokens |
| POST | /auth/refresh | — | — | Refresh access token |
| GET | /media/search?q= | ✓ | any | Search TMDB |
| GET | /media/:id | ✓ | any | Get media detail |
| GET | /media/:id/providers | ✓ | any | Available providers + deep-links |
| GET | /watchlist | ✓ | any | My watchlist |
| POST | /watchlist | ✓ | any | Add to watchlist |
| PATCH | /watchlist/:id | ✓ | any | Update status |
| DELETE | /watchlist/:id | ✓ | any | Remove from watchlist |
| GET | /progress/:mediaId | ✓ | any | My progress for media |
| PUT | /progress/:mediaId | ✓ | any | Update progress |
| POST | /progress/sync | ✓ | any | Pull progress from providers |
| GET | /providers | ✓ | any | List configured providers |
| POST | /providers | ✓ | ADMIN | Add provider |
| PATCH | /providers/:id | ✓ | ADMIN | Update provider |
| DELETE | /providers/:id | ✓ | ADMIN | Delete provider |
| GET | /users | ✓ | ADMIN | List users |
| PATCH | /users/:id/role | ✓ | ADMIN | Change user role |
| DELETE | /users/:id | ✓ | ADMIN | Delete user |

## Plans

- **Plan 1 (this):** Monorepo + Backend core
- **Plan 2:** Provider plugin system + progress sync (Jellyfin/Plex)
- **Plan 3:** Expo frontend — iOS + Web Desktop
- **Plan 4:** Android TV adaptations + production hardening
```

- [ ] **Step 4: Final full test run**

```bash
cd backend && pnpm test
```

Expected: All tests PASS. No failures.

- [ ] **Step 5: Commit**

```bash
git add backend/Dockerfile docker-compose.yml README.md
git commit -m "feat: production Dockerfile, root docker-compose, README"
```

---

## Self-Review

**Spec coverage:**
- Auth (register, login, refresh, first-user=ADMIN) ✅
- JWT middleware + requireAdmin ✅
- Prisma schema (all 6 models, enums) ✅
- Crypto service (AES-256-GCM) ✅
- Watchlist CRUD ✅
- Progress upsert + get ✅
- Provider CRUD (admin, config encrypted) ✅
- Users CRUD (admin) ✅
- Media search (TMDB) + IMDB rating supplement ✅
- Provider links returned from `/media/:id/providers` ✅
- Docker Compose (dev + prod) ✅
- First-run first-user-as-ADMIN ✅
- `/progress/sync` stub (Plan 2 scope) ✅

**Placeholder scan:** None. `/progress/sync` stub is intentional and documented.

**Type consistency:**
- `AuthRequest` defined in `middleware/auth.ts`, used in routes ✅
- `WatchStatus`, `Role`, `MediaType` from `@mytowatch/shared` used consistently ✅
- `EpisodeRef` defined in shared types, `formatEpisodeRef`/`parseEpisodeRef` exported ✅
- `stripConfig` helper in `providerService.ts` used in list, create, update ✅

**Known limitations (Plan 2 scope):**
- TMDB `search/multi` returns `media_type` per result; `search/tv` does not — handled by `explicitType` param fallback
- IMDB rating scrape is best-effort (returns `null` on failure)
- Provider plugin interface and built-in plugins (Jellyfin, Plex, Netflix, etc.) are Plan 2
