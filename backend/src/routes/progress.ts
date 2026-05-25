// backend/src/routes/progress.ts
import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as progressService from '../services/progressService'
import * as providerService from '../services/providerService'
import { get as getPlugin } from '../providers/registry'
import { prisma } from '../db/client'

export const progressRouter = Router()
progressRouter.use(authenticate)

// IMPORTANT: /sync must be before /:mediaId to avoid Express matching "sync" as a mediaId
progressRouter.post('/sync', async (req: AuthRequest, res) => {
  const userId = req.userId!
  let synced = 0

  try {
    // Find ProviderLinks for media in the user's watchlist (enabled providers only)
    const links = await prisma.providerLink.findMany({
      include: {
        provider: true,
        media: { select: { id: true, tmdbId: true } },
      },
      where: {
        provider: { enabled: true },
        media: { watchlist: { some: { userId } } },
      },
    })

    for (const link of links) {
      const plugin = getPlugin(link.provider.pluginKey)
      if (!plugin?.getProgress) continue // skip plugins without progress sync

      const availability = link.availability as { status: string; providerMediaId: string | null }
      if (availability.status !== 'available' || !availability.providerMediaId) continue

      let config: Record<string, string>
      try {
        config = await providerService.getProviderConfig(link.provider.id)
      } catch {
        continue
      }

      let pluginProgress: { positionSec: number; seasonEp: string | null } | null
      try {
        pluginProgress = await plugin.getProgress(availability.providerMediaId, config)
      } catch {
        continue
      }

      if (!pluginProgress || pluginProgress.positionSec === 0) continue

      // Preserve existing seasonEp from our DB if plugin returns null
      let seasonEp = pluginProgress.seasonEp
      if (!seasonEp) {
        const existing = await progressService.getProgress(userId, link.media.id)
        seasonEp = existing?.seasonEp ?? null
      }

      await progressService.upsertProgress(userId, link.media.id, pluginProgress.positionSec, seasonEp)
      synced++
    }

    res.json({ synced })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: 'Sync failed', message })
  }
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
