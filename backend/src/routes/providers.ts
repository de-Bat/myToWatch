// backend/src/routes/providers.ts
import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { requireAdmin } from '../middleware/requireAdmin'
import * as providerService from '../services/providerService'
import { get as getPlugin } from '../providers/registry'

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
  const { action, ...updateData } = req.body

  // Handle test action: call plugin healthCheck
  if (action === 'test') {
    let dbConfig: Record<string, string>
    let pluginKey: string
    try {
      const dbProvider = await providerService.getProviderWithKey(req.params.id)
      pluginKey = dbProvider.pluginKey
      dbConfig = await providerService.getProviderConfig(req.params.id)
    } catch {
      res.status(404).json({ error: 'Provider not found' }); return
    }

    const plugin = getPlugin(pluginKey)
    if (!plugin) {
      res.status(400).json({ error: `Unknown plugin: ${pluginKey}` }); return
    }
    if (!plugin.healthCheck) {
      res.status(400).json({ error: `Plugin ${pluginKey} does not support health check` }); return
    }

    const result = await plugin.healthCheck(dbConfig)
    res.json(result)
    return
  }

  // Normal update (enabled, name, config)
  try {
    const provider = await providerService.updateProvider(req.params.id, updateData)
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
