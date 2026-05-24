import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const testDbUrl = process.env.TEST_DATABASE_URL
if (!testDbUrl) throw new Error('TEST_DATABASE_URL required for tests')

process.env.DATABASE_URL = testDbUrl

const prisma = new PrismaClient()

beforeAll(async () => {
  execSync('npx prisma migrate deploy', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: 'inherit',
  })
})

afterEach(async () => {
  await prisma.providerLink.deleteMany()
  await prisma.progress.deleteMany()
  await prisma.watchlistItem.deleteMany()
  await prisma.media.deleteMany()
  await prisma.provider.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
