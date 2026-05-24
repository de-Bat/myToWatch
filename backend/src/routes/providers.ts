import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { requireAdmin } from '../middleware/requireAdmin'
import * as providerService from '../services/providerService'

export const providersRouter = Router()
providersRouter.use(authenticate)

providersRouter.get('/', async (_req, res) => {
  const providers = await providerService.listProviders()
  res.json(providers)
})

providersRouter.post('/', requireAdmin, async (req: AuthRequest, res) => {
  const { name, pluginKey, config } = req.body
  if (!name || !pluginKey) { res.status(400).json({ error: 'name and pluginKey required' }); return }
  try {
    const provider = await providerService.createProvider(req.userId!, name, pluginKey, config ?? {})
    res.status(201).json(provider)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

providersRouter.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const provider = await providerService.updateProvider(req.params.id, req.body)
    res.json(provider)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

providersRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await providerService.deleteProvider(req.params.id)
    res.status(204).send()
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})
