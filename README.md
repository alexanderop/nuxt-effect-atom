# nuxt-effect-atom

Nuxt lifecycle support for `@effect/atom-vue`: isolated request registries, SSR suspense, hydration without duplicate fetches, explicit Effect layer lifetimes, and development diagnostics.

The package currently targets `effect` and `@effect/atom-vue` `4.0.0-rc.109` exactly. It is dogfood software rather than a stable npm release, so pin the Git revision when installing it.

```bash
pnpm add github:alexanderop/nuxt-effect-atom#<commit>
```

```ts
export default defineNuxtConfig({
  modules: ['nuxt-effect-atom'],
})
```

## What the module owns

- A fresh `AtomRegistry` for every SSR request and client app.
- Registry disposal after SSR completion, SSR errors, setup-hook failures, request cancellation, and client unmount.
- Explicit request- and process-lifetime runtime factories.
- One process scope per Nuxt application, finalized by that Nitro application's `close` hook.
- Serializable atom state in Nuxt's payload-data channel, including extracted/prerendered route payloads.
- Hydration-safe reactivity with optional stale-after-mount revalidation.
- Bounded, abortable SSR suspense.
- Typed request context, lifecycle hooks, payload budgets, testing helpers, and metadata-only development diagnostics.

## Explicit layer lifetimes

Use `requestAtomRuntime` for application, session, request, and browser-owned services. It is the safe default.

```ts
import { requestAtomRuntime } from '#effect-atom'

export const runtime = requestAtomRuntime(AppLive)
```

Use `processAtomRuntime` only for a fully provided layer such as a database pool, tracer, or shared HTTP transport.

```ts
import { processAtomRuntime } from '#effect-atom'

export const runtime = processAtomRuntime(DatabaseLive)
```

The process factory accepts only `Layer<R, E, never>`. A layer still requiring `AtomRegistry`, `Reactivity`, or request services cannot accidentally capture the first SSR request. On the browser, both factories naturally live for the client registry.

`atomRuntime` remains as a deprecated migration bridge. Ambiguous legacy layers now stay request-scoped even when `sharedMemoMap` is enabled.

## SSR suspense

`useAtomSuspense` resolves its atom factory once, awaits async atoms during SSR, and preserves failures as `AsyncResult` values.

```vue
<script setup lang="ts">
const notes = await useAtomSuspense(
  () => notesAtom('alice'),
  { timeout: 10_000, onTimeout: 'render-loading' },
)
</script>
```

The waiter is interrupted when the request aborts. `onTimeout: 'throw'` raises `EffectAtomSuspenseTimeoutError`; `render-loading` keeps the current loading state.

## Serializable reactive atoms

Use `effectAtomSerializable` before `withReactivity`. Besides attaching Effect's schema codec, the wrapper supports per-atom freshness and detects duplicate key ownership in development.

```ts
export const notesAtom = runtime.atom(loadNotes).pipe(
  effectAtomSerializable({
    key: 'notes',
    schema: AsyncResult.Schema({ success: Notes, error: NotesError }),
    staleTime: 30_000,
  }),
  requestAtomRuntime.withReactivity(['notes']),
)
```

Fresh state renders without refetching. Stale state still renders the server value during hydration and revalidates only after the app mounts. Nuxt extracted payloads are also hydrated during navigation, but only for missing registry nodes; live client mutations are never overwritten.

Plain `Atom.serializable` remains supported. The module never serializes atoms automatically.

## Request initialization and Effect context

The `effect-atom:setup` hook runs after the registry and request context exist but before page setup.

```ts
export default defineNuxtPlugin({
  hooks: {
    'effect-atom:setup': ({ registry, request, ssrContext }) => {
      if (!ssrContext) return
      setRequestAtom(registry, localeAtom, request.locale ?? 'en')
      setRequestAtom(registry, sessionAtom, readPublicSession(ssrContext.event))
    },
  },
})
```

`EffectAtomRequest` contains the URL, request ID, locale, abort signal, and a server-only H3 event. Use `withEffectAtomRequest` to provide it to a request-scoped layer:

```ts
const runtime = requestAtomRuntime(
  withEffectAtomRequest(AppLive),
)
```

Never pass this service to `processAtomRuntime`, and never serialize the H3 event or private session authority.

## Payload budgets and safety

Every serializable value is embedded in the rendered Nuxt payload and HTML. Never serialize credentials, access tokens, private authorization state, or data the current browser may not see. Serialization is transport, not a security boundary.

The module reports current and per-key encoded sizes. `warnPayloadBytes` warns; opt-in `maxPayloadBytes` fails rendering when the configured hard limit is exceeded.

## Runtime, hooks, and testing exports

Nuxt code should normally import `#effect-atom`. Framework-independent modules can use:

```ts
import {
  createProcessAtomRuntime,
  createRequestAtomRuntime,
  effectAtomSerializable,
} from 'nuxt-effect-atom/runtime'
```

Lifecycle hooks include:

- `effect-atom:setup`
- `effect-atom:registry:created` and `effect-atom:registry:disposed`
- `effect-atom:dehydrated` and `effect-atom:hydrated`
- `effect-atom:suspense:timeout`
- `effect-atom:event` for process-layer lifecycle metadata

The testing subpath provides automatic cleanup and hydration helpers:

```ts
import {
  createAtomTestHarness,
  createHydratedAtomTestHarness,
  withAtomTestHarness,
} from 'nuxt-effect-atom/testing'
```

`atomRegistryPlugin(harness.registry)` can be passed to Vue Test Utils through `global.plugins` without making Vue Test Utils a package dependency.

## Development diagnostics

Diagnostics are available from `useNuxtApp().$effectAtomDiagnostics`, `window.__effectAtomDiagnostics`, and `getEffectAtomDiagnostics()`. They contain lifecycle counts, current/largest/per-key payload sizes, serialization conflicts, fresh/stale/route hydration decisions, skipped refetches, suspense timeouts, and process-layer acquisition/disposal counts.

When Nuxt DevTools is enabled, the module registers an Effect Atom tab. It shows metadata only and never exposes atom values. Consumers can also subscribe through `subscribeEffectAtomEvents`.

## Options

```ts
export default defineNuxtConfig({
  effectAtom: {
    perRequestRegistry: true,
    hydrate: true,
    sharedMemoMap: true, // deprecated legacy-runtime behavior only
    ssrSuspense: true,
    ssrSuspenseTimeout: 15_000,
    ssrSuspenseTimeoutMode: 'render-loading',
    hydrationStaleTime: false,
    routePayloadHydration: true,
    autoImports: true,
    diagnostics: true,
    warnOnPayload: true,
    warnPayloadBytes: 65_536,
    maxPayloadBytes: false,
    duplicateKeyPolicy: 'warn',
    registry: {
      defaultIdleTTL: undefined,
      timeoutResolution: undefined,
    },
    devtools: true,
  },
})
```

## Verification

```bash
pnpm install
pnpm lint
pnpm test:types
pnpm test
pnpm dev:build
```

The suite covers concurrent-request isolation, keyed process ownership, finalization, hydration without refetch, stale-after-mount revalidation, route-state merge policy, bounded suspense, client navigation, duplicate key enforcement, and the testing harness.

`dist/` is committed because Git installs do not reliably run package build scripts. Run `pnpm prepack` after changing `src/`.
