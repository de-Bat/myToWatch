// backend/src/routes/media.ts
import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import * as mediaService from '../services/mediaService'
import * as providerService from '../services/providerService'
import { get as getPlugin } from '../providers/registry'
import { prisma } from '../db/client'
import type { MediaType } from '@mytowatch/shared'
import type { Availability } from '../providers/interface'

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
  const media = await mediaService.getById(req.params.id)
  if (!media) { res.status(404).json({ error: 'Not found' }); return }

  // Fetch all enabled provider DB rows
  const dbProviders = await prisma.provider.findMany({ where: { enabled: true } })

  const results: {
    providerId: string
    providerName: string
    pluginKey: string
    availability: Availability
    deepLink: string | null
  }[] = []

  for (const dbProvider of dbProviders) {
    const plugin = getPlugin(dbProvider.pluginKey)
    if (!plugin) continue // unknown pluginKey — skip silently

    let config: Record<string, string>
    try {
      config = await providerService.getProviderConfig(dbProvider.id)
    } catch {
      continue // can't decrypt config — skip
    }

    let availability: Availability
    try {
      availability = await plugin.getAvailability(media.tmdbId, config)
    } catch {
      availability = { status: 'unknown', providerMediaId: null }
    }

    let deepLink: string | null = null
    if (availability.status === 'available' && availability.providerMediaId) {
      try {
        deepLink = await plugin.getDeepLink(availability.providerMediaId, null, config)
      } catch {
        deepLink = null
      }

      // Upsert ProviderLink so the DB stays fresh (best-effort)
      try {
        await prisma.providerLink.upsert({
          where: { mediaId_providerId: { mediaId: media.id, providerId: dbProvider.id } },
          create: {
            mediaId: media.id,
            providerId: dbProvider.id,
            deepLinkTemplate: deepLink ?? '',
            availability: availability as object,
          },
          update: {
            deepLinkTemplate: deepLink ?? '',
            availability: availability as object,
          },
        })
      } catch {
        // Non-fatal — don't fail the response if upsert fails
      }
    }

    results.push({
      providerId: dbProvider.id,
      providerName: dbProvider.name,
      pluginKey: dbProvider.pluginKey,
      availability,
      deepLink,
    })
  }

  res.json(results)
})
