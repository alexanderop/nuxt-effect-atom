import { addImports, addPlugin, addServerPlugin, addTemplate, addTypeTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'

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
   * Back `atomRuntime` with one process-wide `Layer.MemoMap` on the server, so
   * layers are built once per process rather than once per request registry.
   */
  sharedMemoMap: boolean
  /**
   * Let `useAtomSuspense` await an async atom during SSR. With this off it
   * degrades to `useAtomValue` and the server renders the loading state.
   */
  ssrSuspense: boolean
  /** Auto-import the `useAtom*` family and `atomRuntime`. */
  autoImports: boolean
  /** Collect lifecycle, hydration, payload-size, and layer diagnostics. */
  diagnostics: boolean
  /** Warn in development when serializable atoms are embedded in HTML. */
  warnOnPayload: boolean
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
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Options have to be readable at module-evaluation time (the shared MemoMap
    // is created when runtime.ts is first imported), so they go through a
    // virtual module rather than runtimeConfig.
    const template = addTemplate({
      filename: 'effect-atom-options.mjs',
      write: true,
      getContents: () => `export const options = ${JSON.stringify(options)}\n`,
    })
    addTypeTemplate({
      filename: 'effect-atom-options.d.ts',
      getContents: () =>
        `declare module '#effect-atom/options' {\n`
        + `  export const options: import('nuxt-effect-atom').ModuleOptions\n`
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

    if (options.autoImports) {
      addImports([
        { name: 'atomRuntime', from: resolver.resolve('./runtime/runtime') },
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
