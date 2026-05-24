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
