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
