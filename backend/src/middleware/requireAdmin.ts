import { Response, NextFunction } from 'express'
import type { AuthRequest } from './auth'

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'ADMIN') {
    res.status(403).json({ error: 'Admin required' })
    return
  }
  next()
}
