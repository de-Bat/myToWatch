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
