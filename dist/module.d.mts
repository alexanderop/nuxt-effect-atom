import * as _nuxt_schema from '@nuxt/schema';

interface ModuleOptions {
    /**
     * Provide a fresh `AtomRegistry` per request instead of falling back to the
     * module-level `defaultRegistry` in `@effect/atom-vue`.
     *
     * Turning this off is what a Nuxt app gets by default today, and it leaks
     * atom state between concurrent requests.
     */
    perRequestRegistry: boolean;
    /**
     * Dehydrate serializable atoms into the Nuxt payload after render and
     * hydrate them into the client registry before the app mounts.
     */
    hydrate: boolean;
    /**
     * Back `atomRuntime` with one process-wide `Layer.MemoMap` on the server, so
     * layers are built once per process rather than once per request registry.
     */
    sharedMemoMap: boolean;
    /**
     * Let `useAtomSuspense` await an async atom during SSR. With this off it
     * degrades to `useAtomValue` and the server renders the loading state.
     */
    ssrSuspense: boolean;
    /** Auto-import the `useAtom*` family and `atomRuntime`. */
    autoImports: boolean;
    /** Collect lifecycle, hydration, payload-size, and layer diagnostics. */
    diagnostics: boolean;
    /** Warn in development when serializable atoms are embedded in HTML. */
    warnOnPayload: boolean;
}
declare const _default: _nuxt_schema.NuxtModule<ModuleOptions, ModuleOptions, false>;

export { _default as default };
export type { ModuleOptions };
