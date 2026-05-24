import { Router } from 'express'
import * as authService from '../services/authService'

export const authRouter = Router()

authRouter.post('/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) { res.status(400).json({ error: 'email and password required' }); return }
  try {
    const { user, tokens } = await authService.register(email, password)
    res.status(201).json({ user, ...tokens })
  } catch (err: any) {
    if (err.code === 'DUPLICATE_EMAIL') { res.status(409).json({ error: err.message }); return }
    res.status(500).json({ error: 'Internal server error' })
  }
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) { res.status(400).json({ error: 'email and password required' }); return }
  try {
    const { user, tokens } = await authService.login(email, password)
    res.status(200).json({ user, ...tokens })
  } catch (err: any) {
    if (err.code === 'INVALID_CREDENTIALS') { res.status(401).json({ error: err.message }); return }
    res.status(500).json({ error: 'Internal server error' })
  }
})

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) { res.status(400).json({ error: 'refreshToken required' }); return }
  try {
    const tokens = await authService.refresh(refreshToken)
    res.status(200).json(tokens)
  } catch (err: any) {
    if (err.code === 'INVALID_TOKEN' || err.code === 'NOT_FOUND') {
      res.status(401).json({ error: err.message }); return
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})
