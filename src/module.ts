import { addCustomTab } from '@nuxt/devtools-kit'
import { addImports, addPlugin, addServerHandler, addServerPlugin, addTemplate, addTypeTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'

export interface RegistryOptions {
  /** Idle milliseconds before an unmounted atom may be removed. */
  defaultIdleTTL?: number
  /** Resolution used by the registry's timeout buckets. */
  timeoutResolution?: number
}

export interface ModuleOptions {
  /**
   * Provide a fresh `AtomRegistry` per request instead of falling back to the
   * module-level `defaultRegistry` in `@effect/atom-vue`.
   *
   * Turning this off is what a Nuxt app gets by default today, and it leaks
   * atom state between concurrent requests.
   */
  perRequestRegistry: boolean
  /**
   * Dehydrate serializable atoms into the Nuxt payload after render and
   * hydrate them into the client registry before the app mounts.
   */
  hydrate: boolean
  /**
   * Deprecated compatibility option for legacy `atomRuntime` call sites.
   * Prefer the explicit `requestAtomRuntime` or `processAtomRuntime` factories.
   */
  sharedMemoMap: boolean
  /**
   * Let `useAtomSuspense` await an async atom during SSR. With this off it
   * degrades to `useAtomValue` and the server renders the loading state.
   */
  ssrSuspense: boolean
  /** Auto-import composables, runtime factories, and serialization helpers. */
  autoImports: boolean
  /** Collect lifecycle, hydration, payload-size, and layer diagnostics. */
  diagnostics: boolean
  /** Warn in development when serializable atoms are embedded in HTML. */
  warnOnPayload: boolean
  /** Warn when one rendered payload exceeds this many bytes. `false` disables it. */
  warnPayloadBytes: number | false
  /** Fail rendering when one payload exceeds this many bytes. `false` disables it. */
  maxPayloadBytes: number | false
  /** Development behavior when two atom definitions declare the same serialization key. */
  duplicateKeyPolicy: 'warn' | 'error'
  /** Milliseconds before hydrated data is revalidated after mount. `false` means never stale. */
  hydrationStaleTime: number | false
  /** Load atom state from extracted/prerendered Nuxt payloads during navigation. */
  routePayloadHydration: boolean
  /** Maximum SSR wait for `useAtomSuspense`. `false` disables the timeout. */
  ssrSuspenseTimeout: number | false
  /** What `useAtomSuspense` does when its SSR timeout elapses. */
  ssrSuspenseTimeoutMode: 'render-loading' | 'throw'
  /** Options forwarded to each owned `AtomRegistry`. */
  registry: RegistryOptions
  /** Register a metadata-only Effect Atom tab in Nuxt DevTools during development. */
  devtools: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-effect-atom',
    configKey: 'effectAtom',
    compatibility: { nuxt: '>=4.0.0' },
  },
  defaults: {
    perRequestRegistry: true,
    hydrate: true,
    sharedMemoMap: true,
    ssrSuspense: true,
    autoImports: true,
    diagnostics: true,
    warnOnPayload: true,
    warnPayloadBytes: 65_536,
    maxPayloadBytes: false,
    duplicateKeyPolicy: 'warn',
    hydrationStaleTime: false,
    routePayloadHydration: true,
    ssrSuspenseTimeout: 15_000,
    ssrSuspenseTimeoutMode: 'render-loading',
    registry: {},
    devtools: true,
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const runtimeKey = `${nuxt.options.rootDir}:${nuxt.options.appId}`

    // Options have to be readable at module-evaluation time (the shared MemoMap
    // is created when runtime.ts is first imported), so they go through a
    // virtual module rather than runtimeConfig.
    const template = addTemplate({
      filename: 'effect-atom-options.mjs',
      write: true,
      getContents: () => `export const options = ${JSON.stringify(options)}\nexport const runtimeKey = ${JSON.stringify(runtimeKey)}\n`,
    })
    addTypeTemplate({
      filename: 'effect-atom-options.d.ts',
      getContents: () =>
        `declare module '#effect-atom/options' {\n`
        + `  export const options: import('nuxt-effect-atom').ModuleOptions\n`
        + `  export const runtimeKey: string\n`
        + `}\n`,
    })
    nuxt.options.alias['#effect-atom/options'] = template.dst
    nuxt.options.alias['#effect-atom'] = resolver.resolve('./runtime/index')

    // `effect` and `@effect/atom-vue` ship untranspiled ESM with deep subpath
    // exports; Nitro must bundle them rather than externalise them.
    nuxt.options.nitro.externals ||= {}
    nuxt.options.nitro.externals.inline ||= []
    nuxt.options.nitro.externals.inline.push('effect', '@effect/atom-vue')

    addPlugin({ src: resolver.resolve('./runtime/plugin'), mode: 'all' })
    addServerPlugin(resolver.resolve('./runtime/server/nitro-plugin'))

    if (nuxt.options.dev && options.devtools) {
      addServerHandler({
        route: '/__effect-atom/diagnostics',
        handler: resolver.resolve('./runtime/server/diagnostics-handler'),
      })
      addServerHandler({
        route: '/__effect-atom/devtools',
        handler: resolver.resolve('./runtime/server/devtools-handler'),
      })
      addCustomTab({
        name: 'effect-atom',
        title: 'Effect Atom',
        icon: 'i-logos-effect',
        category: 'modules',
        view: {
          type: 'iframe',
          src: '/__effect-atom/devtools',
        },
      }, nuxt)
    }

    if (options.autoImports) {
      addImports([
        { name: 'atomRuntime', from: resolver.resolve('./runtime/runtime') },
        { name: 'requestAtomRuntime', from: resolver.resolve('./runtime/runtime') },
        { name: 'processAtomRuntime', from: resolver.resolve('./runtime/runtime') },
        { name: 'effectAtomSerializable', from: resolver.resolve('./runtime/serialization') },
        { name: 'useAtomSuspense', from: resolver.resolve('./runtime/composables/useAtomSuspense') },
        { name: 'useAtomRegistry', from: resolver.resolve('./runtime/composables/useAtomRegistry') },
        ...(['useAtom', 'useAtomValue', 'useAtomSet', 'useAtomRef'] as const).map(name => ({
          name,
          from: '@effect/atom-vue',
        })),
      ])
    }
  },
})
