import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as progressService from '../services/progressService'

export const progressRouter = Router()
progressRouter.use(authenticate)

// IMPORTANT: /sync must be before /:mediaId to avoid Express matching "sync" as a mediaId
progressRouter.post('/sync', async (_req, res) => {
  res.json({ synced: 0, message: 'Provider sync implemented in Plan 2' })
})

progressRouter.get('/:mediaId', async (req: AuthRequest, res) => {
  const progress = await progressService.getProgress(req.userId!, req.params.mediaId)
  res.json(progress ?? null)
})

progressRouter.put('/:mediaId', async (req: AuthRequest, res) => {
  const { positionSec, seasonEp } = req.body
  if (positionSec === undefined) { res.status(400).json({ error: 'positionSec required' }); return }
  try {
    const progress = await progressService.upsertProgress(
      req.userId!,
      req.params.mediaId,
      positionSec,
      seasonEp,
    )
    res.json(progress)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})
