import { prisma } from '../db/client'
import { encrypt, decrypt } from './cryptoService'

function stripConfig<T extends { config: string }>(p: T): Omit<T, 'config'> {
  const { config: _, ...safe } = p
  return safe
}

export async function listProviders() {
  const providers = await prisma.provider.findMany({ orderBy: { name: 'asc' } })
  return providers.map(stripConfig)
}

export async function createProvider(
  userId: string,
  name: string,
  pluginKey: string,
  config: Record<string, string>,
) {
  const encryptedConfig = encrypt(JSON.stringify(config))
  const provider = await prisma.provider.create({
    data: { name, pluginKey, config: encryptedConfig, createdBy: userId },
  })
  return stripConfig(provider)
}

export async function updateProvider(
  id: string,
  data: { enabled?: boolean; name?: string; config?: Record<string, string> },
) {
  const update: Record<string, unknown> = {}
  if (data.enabled !== undefined) update.enabled = data.enabled
  if (data.name !== undefined) update.name = data.name
  if (data.config !== undefined) update.config = encrypt(JSON.stringify(data.config))
  const provider = await prisma.provider.update({ where: { id }, data: update })
  return stripConfig(provider)
}

export async function deleteProvider(id: string) {
  await prisma.provider.delete({ where: { id } })
}

export async function getProviderConfig(id: string): Promise<Record<string, string>> {
  const provider = await prisma.provider.findUniqueOrThrow({ where: { id } })
  return JSON.parse(decrypt(provider.config))
}
