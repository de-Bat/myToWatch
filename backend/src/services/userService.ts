import { prisma } from '../db/client'
import type { Role } from '@mytowatch/shared'

export async function listUsers() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
  return users.map(({ passwordHash: _, ...u }: (typeof users)[number]) => u)
}

export async function setRole(id: string, role: Role) {
  const user = await prisma.user.update({ where: { id }, data: { role } })
  const { passwordHash: _, ...safe } = user
  return safe
}

export async function deleteUser(id: string) {
  await prisma.user.delete({ where: { id } })
}
