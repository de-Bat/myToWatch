import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import * as mediaService from '../services/mediaService'
import type { MediaType } from '@mytowatch/shared'

export const mediaRouter = Router()
mediaRouter.use(authenticate)

mediaRouter.get('/search', async (req, res) => {
  const { q, type } = req.query
  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: 'q query param required' }); return
  }
  try {
    const results = await mediaService.searchTmdb(q, type as MediaType | undefined)
    res.json(results)
  } catch {
    res.status(500).json({ error: 'Search failed' })
  }
})

mediaRouter.get('/:id', async (req, res) => {
  const media = await mediaService.getById(req.params.id)
  if (!media) { res.status(404).json({ error: 'Not found' }); return }
  res.json(media)
})

mediaRouter.get('/:id/providers', async (req, res) => {
  const providers = await mediaService.getProviders(req.params.id)
  res.json(providers)
})
