import { AtomRegistry, defaultRegistry, registryKey } from '@effect/atom-vue'
import * as Hydration from 'effect/unstable/reactivity/Hydration'
import { defineNuxtPlugin, loadPayload, useRouter, type NuxtApp } from '#app'
import { options } from '#effect-atom/options'
import {
  exposeEffectAtomDiagnostics,
  flushStaleHydrationRefreshes,
  getEffectAtomDiagnostics,
  recordDehydration,
  recordPayloadRejection,
  recordPayloadWarning,
  recordRegistryCreated,
  recordRegistryDisposed,
  subscribeEffectAtomEvents,
  type EffectAtomDiagnostics,
  type EffectAtomEvent,
  type PayloadDiagnostics,
} from './diagnostics'
import { EFFECT_ATOM_PAYLOAD_KEY, hydrateRegistry, isDehydratedState } from './hydration'
import {
  effectAtomRequestLayer,
  setEffectAtomRequestContext,
  type EffectAtomRequestContext,
} from './request'

let payloadWarningShown = false

const requestContext = (
  nuxtApp: NuxtApp,
  controller: AbortController,
): EffectAtomRequestContext => {
  const event = nuxtApp.ssrContext?.event
  const headers = event?.headers
  return {
    server: import.meta.server,
    url: nuxtApp.ssrContext?.url ?? (import.meta.client ? window.location.href : 'http://localhost/'),
    requestId: headers?.get('x-request-id') ?? undefined,
    locale: headers?.get('accept-language')?.split(',')[0]?.trim() || undefined,
    signal: event?.web?.request?.signal ?? controller.signal,
    event,
  }
}

const payloadState = (nuxtApp: NuxtApp): unknown =>
  nuxtApp.payload.data[EFFECT_ATOM_PAYLOAD_KEY]
  ?? Reflect.get(nuxtApp.payload, 'effectAtom')

const reportPayload = (
  report: PayloadDiagnostics,
): void => {
  if (options.maxPayloadBytes !== false && report.bytes > options.maxPayloadBytes) {
    recordPayloadRejection(report.bytes, options.maxPayloadBytes)
    throw new Error(
      `[nuxt-effect-atom] Payload is ${report.bytes} bytes, exceeding maxPayloadBytes (${options.maxPayloadBytes}).`,
    )
  }
  if (options.warnPayloadBytes !== false && report.bytes > options.warnPayloadBytes) {
    recordPayloadWarning(report.bytes, options.warnPayloadBytes)
    console.warn(
      `[nuxt-effect-atom] Payload is ${report.bytes} bytes, exceeding warnPayloadBytes (${options.warnPayloadBytes}).`,
    )
  }
}

export default defineNuxtPlugin({
  name: 'nuxt-effect-atom',
  enforce: 'pre',
  async setup(nuxtApp) {
    const ownsRegistry = options.perRequestRegistry
    const registry = ownsRegistry ? AtomRegistry.make(options.registry) : defaultRegistry
    const abortController = new AbortController()
    const context = requestContext(nuxtApp, abortController)
    const unsubscribeEvents = subscribeEffectAtomEvents((event) => {
      if (event.type === 'layer:acquired' || event.type === 'layer:disposed') {
        void nuxtApp.callHook('effect-atom:event', event)
      }
    })

    setEffectAtomRequestContext(registry, context)
    nuxtApp.vueApp.provide(registryKey, registry)
    nuxtApp.$effectAtomRegistry = registry
    nuxtApp.$effectAtomRequest = context
    Object.defineProperty(nuxtApp, '$effectAtomDiagnostics', {
      configurable: true,
      get: getEffectAtomDiagnostics,
    })

    if (ownsRegistry && options.diagnostics) {
      recordRegistryCreated()
    }

    let disposed = false
    function dispose() {
      if (disposed) return
      disposed = true
      abortController.abort('registry disposed')
      unsubscribeEvents()
      context.event?.node.req.off('aborted', abortRequest)
      if (!ownsRegistry) return
      registry.dispose()
      if (options.diagnostics) recordRegistryDisposed()
      void nuxtApp.callHook('effect-atom:registry:disposed')
    }
    function abortRequest() {
      abortController.abort('request aborted')
      dispose()
    }
    context.event?.node.req.once('aborted', abortRequest)

    if (import.meta.server) {
      nuxtApp.hook('app:error', dispose)
      nuxtApp.hook('app:rendered', async () => {
        try {
          if (!options.hydrate) return
          const state = Hydration.dehydrate(registry)
          nuxtApp.payload.data[EFFECT_ATOM_PAYLOAD_KEY] = state
          const report = options.diagnostics
            ? recordDehydration(state)
            : { bytes: new TextEncoder().encode(JSON.stringify(state)).byteLength, atomBytes: {} }
          reportPayload(report)
          await nuxtApp.callHook('effect-atom:dehydrated', {
            atoms: state.length,
            bytes: report.bytes,
            atomBytes: report.atomBytes,
          })
          if (import.meta.dev && options.diagnostics) {
            const diagnostics = getEffectAtomDiagnostics()
            console.debug('[nuxt-effect-atom] SSR diagnostics', {
              atoms: state.length,
              payloadBytes: report.bytes,
              duplicateSerializationKeys: diagnostics.duplicateSerializationKeys,
              serializationKeyConflicts: diagnostics.serializationKeyConflicts,
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

    try {
      if (ownsRegistry && options.diagnostics) {
        await nuxtApp.callHook('effect-atom:registry:created', { registry })
      }
      await nuxtApp.callHook('effect-atom:setup', {
        nuxtApp,
        registry,
        request: context,
        requestLayer: effectAtomRequestLayer(context),
        ssrContext: nuxtApp.ssrContext,
      })
    }
    catch (error) {
      dispose()
      throw error
    }

    if (!options.hydrate || !import.meta.client) return

    const initialState = payloadState(nuxtApp)
    if (isDehydratedState(initialState)) {
      const atoms = hydrateRegistry(registry, initialState)
      await nuxtApp.callHook('effect-atom:hydrated', { atoms, route: false })
    }

    if (options.routePayloadHydration) {
      const router = useRouter()
      router.beforeResolve(async (to, from) => {
        if (to.fullPath === from.fullPath) return
        const payload = await nuxtApp.runWithContext(() => loadPayload(to.fullPath)).catch(() => null)
        const routeState = payload?.data?.[EFFECT_ATOM_PAYLOAD_KEY]
        if (!isDehydratedState(routeState)) return
        const atoms = hydrateRegistry(registry, routeState, { missingOnly: true, route: true })
        if (atoms > 0) await nuxtApp.callHook('effect-atom:hydrated', { atoms, route: true })
      })
    }

    if (options.diagnostics) exposeEffectAtomDiagnostics()
    nuxtApp.hook('page:finish', () => flushStaleHydrationRefreshes(registry))
    nuxtApp.hook('app:mounted', () => {
      flushStaleHydrationRefreshes(registry)
      if (import.meta.dev && options.diagnostics) {
        console.debug('[nuxt-effect-atom] Client diagnostics', getEffectAtomDiagnostics())
      }
    })
  },
})

declare module '#app' {
  interface RuntimeNuxtHooks {
    'effect-atom:setup': (context: {
      readonly nuxtApp: NuxtApp
      readonly registry: AtomRegistry.AtomRegistry
      readonly request: EffectAtomRequestContext
      readonly requestLayer: ReturnType<typeof effectAtomRequestLayer>
      readonly ssrContext: NuxtApp['ssrContext']
    }) => void | Promise<void>
    'effect-atom:registry:created': (context: {
      readonly registry: AtomRegistry.AtomRegistry
    }) => void | Promise<void>
    'effect-atom:registry:disposed': () => void | Promise<void>
    'effect-atom:dehydrated': (context: {
      readonly atoms: number
      readonly bytes: number
      readonly atomBytes: Readonly<Record<string, number>>
    }) => void | Promise<void>
    'effect-atom:hydrated': (context: {
      readonly atoms: number
      readonly route: boolean
    }) => void | Promise<void>
    'effect-atom:suspense:timeout': (context: {
      readonly timeout: number
    }) => void | Promise<void>
    'effect-atom:event': (event: EffectAtomEvent) => void | Promise<void>
  }

  interface NuxtApp {
    $effectAtomRegistry: AtomRegistry.AtomRegistry
    $effectAtomRequest: EffectAtomRequestContext
    readonly $effectAtomDiagnostics: Readonly<EffectAtomDiagnostics>
  }
}
