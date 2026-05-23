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
