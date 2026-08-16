import { type AtomRegistry, injectRegistry } from '@effect/atom-vue'

/**
 * The registry for the current request (server) or tab (client).
 *
 * Must be called during `setup`, before any `await`.
 */
export const useAtomRegistry = (): AtomRegistry.AtomRegistry => injectRegistry()
