import { AtomRegistry, defaultRegistry, registryKey } from '@effect/atom-vue'
import * as Hydration from 'effect/unstable/reactivity/Hydration'
import { defineNuxtPlugin } from '#app'
import { options } from '#effect-atom/options'
import {
  exposeEffectAtomDiagnostics,
  getEffectAtomDiagnostics,
  recordDehydration,
  recordRegistryCreated,
  recordRegistryDisposed,
  rememberHydration,
  type EffectAtomDiagnostics,
} from './diagnostics'

let payloadWarningShown = false

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
  async setup(nuxtApp) {
    const ownsRegistry = options.perRequestRegistry
    const registry = ownsRegistry ? AtomRegistry.make() : defaultRegistry
    if (ownsRegistry && options.diagnostics) recordRegistryCreated()
    nuxtApp.vueApp.provide(registryKey, registry)
    nuxtApp.$effectAtomRegistry = registry
    Object.defineProperty(nuxtApp, '$effectAtomDiagnostics', {
      configurable: true,
      get: getEffectAtomDiagnostics,
    })

    let disposed = false
    const dispose = () => {
      if (!ownsRegistry || disposed) return
      disposed = true
      registry.dispose()
      if (options.diagnostics) recordRegistryDisposed()
    }

    if (import.meta.server) {
      nuxtApp.hook('app:error', dispose)
      nuxtApp.hook('app:rendered', () => {
        try {
          if (!options.hydrate) return
          const state = Hydration.dehydrate(registry)
          nuxtApp.payload.effectAtom = state
          if (options.diagnostics) recordDehydration(state)
          if (import.meta.dev && options.diagnostics) {
            const diagnostics = getEffectAtomDiagnostics()
            console.debug('[nuxt-effect-atom] SSR diagnostics', {
              atoms: state.length,
              payloadBytes: diagnostics.payloadBytes,
              duplicateSerializationKeys: diagnostics.duplicateSerializationKeys,
              registriesCreated: diagnostics.registriesCreated,
              registriesDisposed: diagnostics.registriesDisposed,
              processLayerBuilds: diagnostics.processLayerBuilds,
            })
          }
          if (import.meta.dev && options.warnOnPayload && state.length > 0 && !payloadWarningShown) {
            payloadWarningShown = true
            console.warn(
              '[nuxt-effect-atom] Serializable atom values are embedded in the Nuxt payload and SSR HTML. Never serialize credentials, tokens, or other secrets.',
            )
          }
        }
        finally {
          dispose()
        }
      })
    }
    else {
      nuxtApp.vueApp.onUnmount(dispose)
    }

    await nuxtApp.callHook('effect-atom:setup', {
      nuxtApp,
      registry,
      ssrContext: nuxtApp.ssrContext,
    })

    if (!options.hydrate) return

    if (import.meta.client) {
      const state = nuxtApp.payload.effectAtom as
        | ReadonlyArray<Hydration.DehydratedAtom>
        | undefined
      if (state?.length) {
        rememberHydration(registry, state)
        Hydration.hydrate(registry, state)
      }
      if (options.diagnostics) exposeEffectAtomDiagnostics()
      if (import.meta.dev && options.diagnostics) {
        nuxtApp.hook('app:mounted', () => {
          console.debug('[nuxt-effect-atom] Client diagnostics', getEffectAtomDiagnostics())
        })
      }
    }
  },
})

declare module '#app' {
  interface RuntimeNuxtHooks {
    'effect-atom:setup': (context: {
      readonly nuxtApp: NuxtApp
      readonly registry: AtomRegistry.AtomRegistry
      readonly ssrContext: NuxtApp['ssrContext']
    }) => void | Promise<void>
  }

  interface NuxtApp {
    $effectAtomRegistry: AtomRegistry.AtomRegistry
    readonly $effectAtomDiagnostics: Readonly<EffectAtomDiagnostics>
  }
}
