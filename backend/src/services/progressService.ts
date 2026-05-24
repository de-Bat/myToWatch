import { prisma } from '../db/client'

export async function getProgress(userId: string, mediaId: string) {
  return prisma.progress.findUnique({
    where: { userId_mediaId: { userId, mediaId } },
  })
}

export async function upsertProgress(
  userId: string,
  mediaId: string,
  positionSec: number,
  seasonEp?: string | null,
) {
  return prisma.progress.upsert({
    where: { userId_mediaId: { userId, mediaId } },
    create: { userId, mediaId, positionSec, seasonEp: seasonEp ?? null },
    update: { positionSec, seasonEp: seasonEp ?? null },
  })
}
