import * as _nuxt_schema from '@nuxt/schema';

interface RegistryOptions {
    /** Idle milliseconds before an unmounted atom may be removed. */
    defaultIdleTTL?: number;
    /** Resolution used by the registry's timeout buckets. */
    timeoutResolution?: number;
}
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
     * Deprecated compatibility option for legacy `atomRuntime` call sites.
     * Prefer the explicit `requestAtomRuntime` or `processAtomRuntime` factories.
     */
    sharedMemoMap: boolean;
    /**
     * Let `useAtomSuspense` await an async atom during SSR. With this off it
     * degrades to `useAtomValue` and the server renders the loading state.
     */
    ssrSuspense: boolean;
    /** Auto-import composables, runtime factories, and serialization helpers. */
    autoImports: boolean;
    /** Collect lifecycle, hydration, payload-size, and layer diagnostics. */
    diagnostics: boolean;
    /** Warn in development when serializable atoms are embedded in HTML. */
    warnOnPayload: boolean;
    /** Warn when one rendered payload exceeds this many bytes. `false` disables it. */
    warnPayloadBytes: number | false;
    /** Fail rendering when one payload exceeds this many bytes. `false` disables it. */
    maxPayloadBytes: number | false;
    /** Development behavior when two atom definitions declare the same serialization key. */
    duplicateKeyPolicy: 'warn' | 'error';
    /** Milliseconds before hydrated data is revalidated after mount. `false` means never stale. */
    hydrationStaleTime: number | false;
    /** Load atom state from extracted/prerendered Nuxt payloads during navigation. */
    routePayloadHydration: boolean;
    /** Maximum SSR wait for `useAtomSuspense`. `false` disables the timeout. */
    ssrSuspenseTimeout: number | false;
    /** What `useAtomSuspense` does when its SSR timeout elapses. */
    ssrSuspenseTimeoutMode: 'render-loading' | 'throw';
    /** Options forwarded to each owned `AtomRegistry`. */
    registry: RegistryOptions;
    /** Register a metadata-only Effect Atom tab in Nuxt DevTools during development. */
    devtools: boolean;
}
declare const _default: _nuxt_schema.NuxtModule<ModuleOptions, ModuleOptions, false>;

export { _default as default };
export type { ModuleOptions, RegistryOptions };
