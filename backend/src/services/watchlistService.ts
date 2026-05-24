import { prisma } from '../db/client'
import type { WatchStatus } from '@mytowatch/shared'

export async function getWatchlist(userId: string) {
  return prisma.watchlistItem.findMany({
    where: { userId },
    include: { media: true },
    orderBy: { addedAt: 'desc' },
  })
}

export async function addItem(userId: string, mediaId: string, status: WatchStatus = 'PLAN') {
  return prisma.watchlistItem.create({
    data: { userId, mediaId, status },
    include: { media: true },
  })
}

export async function updateItem(id: string, userId: string, status: WatchStatus) {
  const item = await prisma.watchlistItem.findFirst({ where: { id, userId } })
  if (!item) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' })
  return prisma.watchlistItem.update({ where: { id }, data: { status }, include: { media: true } })
}

export async function removeItem(id: string, userId: string) {
  const item = await prisma.watchlistItem.findFirst({ where: { id, userId } })
  if (!item) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' })
  await prisma.watchlistItem.delete({ where: { id } })
}
