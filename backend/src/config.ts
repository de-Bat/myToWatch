import dotenv from 'dotenv'
dotenv.config()

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  encryptionKey: requireEnv('ENCRYPTION_KEY'),
  tmdbApiKey: requireEnv('TMDB_API_KEY'),
  accessTokenTtl: '15m' as const,
  refreshTokenTtl: '30d' as const,
}
