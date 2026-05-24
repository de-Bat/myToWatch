// Re-export the registry API from the shared store.
export { register, get, list } from './store'

// Load built-ins eagerly when this module is first imported.
import './plugins/jellyfin'
import './plugins/netflix'
