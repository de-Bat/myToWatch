import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { requireAdmin } from '../middleware/requireAdmin'
import * as userService from '../services/userService'

export const usersRouter = Router()
usersRouter.use(authenticate, requireAdmin)

usersRouter.get('/', async (_req, res) => {
  const users = await userService.listUsers()
  res.json(users)
})

usersRouter.patch('/:id/role', async (req, res) => {
  const { role } = req.body
  if (role !== 'ADMIN' && role !== 'VIEWER') {
    res.status(400).json({ error: 'role must be ADMIN or VIEWER' }); return
  }
  try {
    const user = await userService.setRole(req.params.id, role)
    res.json(user)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

usersRouter.delete('/:id', async (req, res) => {
  try {
    await userService.deleteUser(req.params.id)
    res.status(204).send()
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})
