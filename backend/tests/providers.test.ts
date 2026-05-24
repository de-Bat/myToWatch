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
