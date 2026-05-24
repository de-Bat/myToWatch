import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as watchlistService from '../services/watchlistService'

export const watchlistRouter = Router()
watchlistRouter.use(authenticate)

watchlistRouter.get('/', async (req: AuthRequest, res) => {
  const items = await watchlistService.getWatchlist(req.userId!)
  res.json(items)
})

watchlistRouter.post('/', async (req: AuthRequest, res) => {
  const { mediaId, status } = req.body
  if (!mediaId) { res.status(400).json({ error: 'mediaId required' }); return }
  try {
    const item = await watchlistService.addItem(req.userId!, mediaId, status)
    res.status(201).json(item)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

watchlistRouter.patch('/:id', async (req: AuthRequest, res) => {
  const { status } = req.body
  if (!status) { res.status(400).json({ error: 'status required' }); return }
  try {
    const item = await watchlistService.updateItem(req.params.id, req.userId!, status)
    res.json(item)
  } catch (err: any) {
    if (err.code === 'NOT_FOUND') { res.status(404).json({ error: 'Not found' }); return }
    res.status(500).json({ error: 'Internal server error' })
  }
})

watchlistRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await watchlistService.removeItem(req.params.id, req.userId!)
    res.status(204).send()
  } catch (err: any) {
    if (err.code === 'NOT_FOUND') { res.status(404).json({ error: 'Not found' }); return }
    res.status(500).json({ error: 'Internal server error' })
  }
})
