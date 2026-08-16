import { AtomRegistry } from '@effect/atom-vue';
/**
 * Two jobs, both of which every SSR Effect Atom app needs and none of which
 * `@effect/atom-vue` does for you today:
 *
 * 1. Give this request its own `AtomRegistry`. Without a provide, `useAtom*`
 *    falls back to the module-level `defaultRegistry` — one registry shared by
 *    every concurrent request on the server.
 * 2. Move atom state across the SSR boundary: `Hydration.dehydrate` into the
 *    payload once the app has rendered, `Hydration.hydrate` into the client
 *    registry before the app mounts.
 *
 * Only atoms marked with `Atom.serializable` take part in (2).
 */
declare const _default: import("#app").Plugin<Record<string, unknown>> & import("#app").ObjectPlugin<Record<string, unknown>>;
export default _default;
declare module '#app' {
    interface NuxtApp {
        $effectAtomRegistry: AtomRegistry.AtomRegistry;
    }
}
