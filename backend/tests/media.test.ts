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
  return {
    ...actual,
    searchTmdb: vi.fn().mockResolvedValue([
      {
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
      },
    ]),
  }
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
