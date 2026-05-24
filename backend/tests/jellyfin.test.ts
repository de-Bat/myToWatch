import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { get } from '../src/providers/registry'
import type { MediaProvider } from '../src/providers/interface'

let jellyfin: MediaProvider

beforeEach(() => {
  const plugin = get('jellyfin')
  if (!plugin) throw new Error('Jellyfin plugin not registered — check registry.ts imports')
  jellyfin = plugin
})

afterEach(() => {
  vi.restoreAllMocks()
})

const config = {
  serverUrl: 'http://jellyfin.local:8096',
  apiKey: 'test-api-key',
  jellyfinUserId: 'user-abc-123',
}

describe('jellyfin.search', () => {
  it('returns mapped ProviderResults from Jellyfin Items response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          Items: [
            {
              Id: 'jf-item-1',
              Name: 'Breaking Bad',
              Type: 'Series',
              ProviderIds: { Tmdb: '1396', Imdb: 'tt0903747' },
            },
          ],
          TotalRecordCount: 1,
        }),
        { status: 200 },
      ),
    )

    const results = await jellyfin.search('breaking bad', config)

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      providerMediaId: 'jf-item-1',
      title: 'Breaking Bad',
      type: 'SERIES',
      tmdbId: '1396',
      imdbId: 'tt0903747',
    })
  })

  it('sends the correct URL with encoded search term', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ Items: [], TotalRecordCount: 0 }), { status: 200 }),
    )

    await jellyfin.search('fight club', config)

    const calledUrl = (mockFetch.mock.calls[0][0] as string)
    expect(calledUrl).toContain('searchTerm=fight%20club')
    expect(calledUrl).toContain('IncludeItemTypes=Movie,Series')
    expect(calledUrl).toContain('Fields=ProviderIds')
  })

  it('throws when Jellyfin returns a non-OK status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 }),
    )

    await expect(jellyfin.search('test', config)).rejects.toThrow('401')
  })
})

describe('jellyfin.getAvailability', () => {
  it('returns available with providerMediaId when TMDB ID matches', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          Items: [
            {
              Id: 'jf-item-99',
              Name: 'The Matrix',
              Type: 'Movie',
              ProviderIds: { Tmdb: '603' },
            },
          ],
          TotalRecordCount: 1,
        }),
        { status: 200 },
      ),
    )

    const availability = await jellyfin.getAvailability('603', config)

    expect(availability.status).toBe('available')
    expect(availability.providerMediaId).toBe('jf-item-99')
  })

  it('returns unavailable when no item TMDB ID matches', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          Items: [{ Id: 'jf-item-55', Name: 'Something Else', Type: 'Movie', ProviderIds: { Tmdb: '999' } }],
          TotalRecordCount: 1,
        }),
        { status: 200 },
      ),
    )

    const availability = await jellyfin.getAvailability('603', config)

    expect(availability.status).toBe('unavailable')
    expect(availability.providerMediaId).toBeNull()
  })

  it('returns unavailable when Items is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ Items: [], TotalRecordCount: 0 }), { status: 200 }),
    )

    const availability = await jellyfin.getAvailability('603', config)

    expect(availability.status).toBe('unavailable')
    expect(availability.providerMediaId).toBeNull()
  })
})

describe('jellyfin.getDeepLink', () => {
  it('returns Android TV intent URL with itemId', async () => {
    const link = await jellyfin.getDeepLink('jf-item-42', null, config)
    expect(link).toBe(
      'intent://jellyfin.app/play/jf-item-42#Intent;scheme=jellyfin;package=org.jellyfin.androidtv;end',
    )
  })

  it('includes itemId when episode ref is provided', async () => {
    const link = await jellyfin.getDeepLink('jf-item-42', { season: 2, episode: 5 }, config)
    expect(link).toContain('jf-item-42')
  })
})

describe('jellyfin.getProgress', () => {
  it('returns positionSec converted from ticks', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          UserData: {
            PlaybackPositionTicks: 36_000_000_000,
            Played: false,
          },
        }),
        { status: 200 },
      ),
    )

    const progress = await jellyfin.getProgress!('jf-item-99', config)

    expect(progress).not.toBeNull()
    expect(progress!.positionSec).toBe(3600)
    expect(progress!.seasonEp).toBeNull()
  })

  it('returns null when UserData is absent', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 }),
    )

    const progress = await jellyfin.getProgress!('jf-item-99', config)

    expect(progress).toBeNull()
  })

  it('calls the Users/{userId}/Items/{itemId} endpoint', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ UserData: { PlaybackPositionTicks: 0, Played: false } }), { status: 200 }),
    )

    await jellyfin.getProgress!('jf-item-7', config)

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain(`/Users/${config.jellyfinUserId}/Items/jf-item-7`)
  })
})

describe('jellyfin.healthCheck', () => {
  it('returns ok: true when /System/Info responds 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ServerName: 'MyJellyfin', Version: '10.9.0' }), { status: 200 }),
    )

    const result = await jellyfin.healthCheck!(config)

    expect(result.ok).toBe(true)
    expect(result.message).toContain('reachable')
  })

  it('returns ok: false when fetch throws (server unreachable)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const result = await jellyfin.healthCheck!(config)

    expect(result.ok).toBe(false)
    expect(result.message).toContain('ECONNREFUSED')
  })
})
