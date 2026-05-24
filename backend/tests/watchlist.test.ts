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
