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
