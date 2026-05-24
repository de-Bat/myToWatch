import type { MediaProvider } from './interface'

const plugins = new Map<string, MediaProvider>()

export function register(plugin: MediaProvider): void {
  if (plugins.has(plugin.key)) {
    throw new Error(`Provider plugin already registered: ${plugin.key}`)
  }
  plugins.set(plugin.key, plugin)
}

export function get(key: string): MediaProvider | undefined {
  return plugins.get(key)
}

export function list(): MediaProvider[] {
  return Array.from(plugins.values())
}

// Load built-ins eagerly when this module is first imported.
import './plugins/jellyfin'
import './plugins/netflix'
