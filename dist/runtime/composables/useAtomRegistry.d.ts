import { type AtomRegistry } from '@effect/atom-vue';
/**
 * The registry for the current request (server) or tab (client).
 *
 * Must be called during `setup`, before any `await`.
 */
export declare const useAtomRegistry: () => AtomRegistry.AtomRegistry;
