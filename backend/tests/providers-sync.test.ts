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

  // Add media to user's watchlist (required for sync user scoping)
  await prisma.watchlistItem.create({
    data: { userId, mediaId: media.id, status: 'WATCHING' },
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

    // Add media to user's watchlist (required for sync user scoping)
    await prisma.watchlistItem.create({
      data: { userId, mediaId: media.id, status: 'PLAN' },
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
