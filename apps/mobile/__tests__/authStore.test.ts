// apps/mobile/__tests__/authStore.test.ts
import { useAuthStore } from '../src/lib/authStore'

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}))

const mockFetch = jest.fn()
globalThis.fetch = mockFetch as typeof fetch

beforeEach(() => {
  mockFetch.mockReset()
  useAuthStore.setState({
    serverUrl: 'http://host:3000',
    accessToken: 'old-token',
    refreshToken: 'ref-token',
    userId: 'u1',
    role: 'VIEWER',
  })
})

describe('useAuthStore', () => {
  it('setServerUrl strips trailing slash', () => {
    useAuthStore.getState().setServerUrl('http://host:3000/')
    expect(useAuthStore.getState().serverUrl).toBe('http://host:3000')
  })

  it('setTokens stores all auth fields', () => {
    useAuthStore.getState().setTokens('a', 'r', 'u2', 'ADMIN')
    const s = useAuthStore.getState()
    expect(s.accessToken).toBe('a')
    expect(s.refreshToken).toBe('r')
    expect(s.userId).toBe('u2')
    expect(s.role).toBe('ADMIN')
  })

  it('logout clears tokens but keeps serverUrl', () => {
    useAuthStore.getState().logout()
    const s = useAuthStore.getState()
    expect(s.accessToken).toBeNull()
    expect(s.refreshToken).toBeNull()
    expect(s.userId).toBeNull()
    expect(s.serverUrl).toBe('http://host:3000')
  })

  it('refreshTokens stores new accessToken', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'new-tok' }),
    })
    await useAuthStore.getState().refreshTokens()
    expect(useAuthStore.getState().accessToken).toBe('new-tok')
  })

  it('refreshTokens clears tokens on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
    await expect(useAuthStore.getState().refreshTokens()).rejects.toThrow()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
})
