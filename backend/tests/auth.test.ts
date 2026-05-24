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
