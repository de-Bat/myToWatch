export type Role = 'ADMIN' | 'VIEWER'

export interface User {
  id: string
  email: string
  role: Role
  createdAt: Date
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}
