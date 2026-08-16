import { AtomRegistry, registryKey } from '@effect/atom-vue'
import * as Hydration from 'effect/unstable/reactivity/Hydration'
import { defineNuxtPlugin } from '#app'
import { options } from '#effect-atom/options'

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
export default defineNuxtPlugin({
  name: 'nuxt-effect-atom',
  enforce: 'pre',
  setup(nuxtApp) {
    if (!options.perRequestRegistry) return

    const registry = AtomRegistry.make()
    nuxtApp.vueApp.provide(registryKey, registry)
    nuxtApp.$effectAtomRegistry = registry

    if (!options.hydrate) return

    if (import.meta.server) {
      nuxtApp.hook('app:rendered', () => {
        // Values are already encoded to JSON by each atom's serializable
        // schema, so the payload needs no custom reducer.
        nuxtApp.payload.effectAtom = Hydration.dehydrate(registry)
      })
    }
    else {
      const state = nuxtApp.payload.effectAtom as
        | ReadonlyArray<Hydration.DehydratedAtom>
        | undefined
      // Dev-only diagnostic: lets a browser check assert that hydration ran
      // and how many atoms crossed the boundary.
      if (import.meta.dev) {
        ;(globalThis as Record<string, unknown>).__effectAtomHydrated = state?.length ?? 0
      }
      if (state?.length) Hydration.hydrate(registry, state)
    }
  },
})

declare module '#app' {
  interface NuxtApp {
    $effectAtomRegistry: AtomRegistry.AtomRegistry
  }
}
