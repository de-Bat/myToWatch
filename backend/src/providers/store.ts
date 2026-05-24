import type { MediaProvider } from './interface'

// Shared singleton — imported by both registry.ts (re-exports) and plugin
// files (register).  Keeping the mutable state here breaks the circular
// dependency that would arise if plugins imported from registry.ts.
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
