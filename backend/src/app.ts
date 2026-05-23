import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth'
import { mediaRouter } from './routes/media'
import { watchlistRouter } from './routes/watchlist'
import { progressRouter } from './routes/progress'
import { providersRouter } from './routes/providers'
import { usersRouter } from './routes/users'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.use('/auth', authRouter)
  app.use('/media', mediaRouter)
  app.use('/watchlist', watchlistRouter)
  app.use('/progress', progressRouter)
  app.use('/providers', providersRouter)
  app.use('/users', usersRouter)

  app.get('/health', (_req, res) => res.json({ ok: true }))

  return app
}
