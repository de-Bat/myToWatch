import type { EpisodeRef, MediaType } from './media'
import type { Progress } from './progress'

export interface Provider {
  id: string
  name: string
  pluginKey: string
  enabled: boolean
}

export interface ProviderConfig {
  [key: string]: string
}

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean'
  description: string
  secret?: boolean
}

export interface JSONSchema {
  properties: Record<string, JSONSchemaProperty>
  required: string[]
}

export type AvailabilityStatus = 'available' | 'unavailable' | 'unknown'

export interface Availability {
  status: AvailabilityStatus
  providerMediaId: string | null
}

export interface ProviderResult {
  providerMediaId: string
  title: string
  type: MediaType
  tmdbId: string | null
  imdbId: string | null
}

export interface MediaProvider {
  key: string
  name: string
  configSchema: JSONSchema
  search(query: string, config: ProviderConfig): Promise<ProviderResult[]>
  getAvailability(tmdbId: string, config: ProviderConfig): Promise<Availability>
  getDeepLink(providerMediaId: string, episode: EpisodeRef | null, config: ProviderConfig): Promise<string>
  getProgress?(providerMediaId: string, config: ProviderConfig): Promise<Pick<Progress, 'positionSec' | 'seasonEp'> | null>
  pushProgress?(providerMediaId: string, progress: Pick<Progress, 'positionSec' | 'seasonEp'>, config: ProviderConfig): Promise<void>
  healthCheck?(config: ProviderConfig): Promise<{ ok: boolean; message: string }>
}
