// apps/mobile/__tests__/api.test.ts
import { api, apiRequest } from '../src/lib/api'
import { useAuthStore } from '../src/lib/authStore'

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

function makeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

beforeEach(() => {
  mockFetch.mockReset()
  useAuthStore.setState({
    serverUrl: 'http://localhost:3000',
    accessToken: 'tok-abc',
    refreshToken: 'ref-xyz',
    userId: 'u1',
    role: 'ADMIN',
  })
})

describe('api.get', () => {
  it('calls correct URL with Authorization header', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ items: [] }))
    const result = await api.get<{ items: unknown[] }>('/watchlist')
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/watchlist',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok-abc' }),
      }),
    )
    expect(result).toEqual({ items: [] })
  })

  it('throws when serverUrl is not set', async () => {
    useAuthStore.setState({ serverUrl: null })
    await expect(api.get('/watchlist')).rejects.toThrow('Server not configured')
  })

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ error: 'Not Found' }, 404))
    await expect(api.get('/missing')).rejects.toThrow('404')
  })

  it('auto-refreshes token on 401 and retries', async () => {
    // First call → 401
    mockFetch.mockResolvedValueOnce(makeResponse({ error: 'Unauthorized' }, 401))
    // Refresh call → new token
    mockFetch.mockResolvedValueOnce(makeResponse({ accessToken: 'tok-new' }))
    // Retry → success
    mockFetch.mockResolvedValueOnce(makeResponse({ items: ['x'] }))

    const result = await api.get<{ items: string[] }>('/watchlist')
    expect(result).toEqual({ items: ['x'] })
    expect(mockFetch).toHaveBeenCalledTimes(3)
    // New token stored
    expect(useAuthStore.getState().accessToken).toBe('tok-new')
  })
})

describe('api.post', () => {
  it('sends JSON body with POST method', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ id: '1' }, 201))
    await api.post('/watchlist', { tmdbId: '603' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ tmdbId: '603' }),
      }),
    )
  })
})
