# nuxt-effect-atom

Nuxt SSR lifecycle support for `@effect/atom-vue`: isolated request registries, payload hydration, SSR suspense, and process-owned Effect layers.

The package currently targets `effect` and `@effect/atom-vue` `4.0.0-rc.109` exactly. It is dogfood software rather than a stable npm release, so pin the Git revision when installing it.

```bash
pnpm add github:alexanderop/nuxt-effect-atom#<commit>
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-effect-atom'],
})
```

## What it owns

- A fresh `AtomRegistry` for every SSR request and every client app.
- Deterministic registry disposal after an SSR render or error, and when the client app unmounts.
- One process scope for static server layers. Request registry disposal never closes a process-shared pool; Nitro's `close` hook does.
- Dehydration of serializable atoms into the Nuxt payload and hydration before the client mounts.
- `useAtomSuspense`, which settles async atoms during SSR and keeps them alive until request disposal.
- A hydration-aware `atomRuntime.withReactivity` that does not immediately discard a freshly hydrated value.

```vue
<script setup lang="ts">
const notes = await useAtomSuspense(() => notesAtom('alice'))
</script>
```

## Serializable reactive atoms

Apply `Atom.serializable` before `atomRuntime.withReactivity`. This lets the module recognize the hydrated value and defer the source subscription until the first real invalidation.

```ts
export const notesAtom = runtime.atom(loadNotes).pipe(
  Atom.serializable({
    key: 'notes',
    schema: AsyncResult.Schema({ success: Notes, error: NotesError }),
  }),
  atomRuntime.withReactivity(['notes']),
)
```

The client renders the SSR value without running `loadNotes` again. A mutation using the same reactivity key still refreshes the atom normally.

## Request initialization

Register an `effect-atom:setup` hook in a server plugin. It runs after the request registry exists and before page setup, making it the composition root for session, locale, feature flags, tenant data, and other request-derived atoms.

```ts
// app/plugins/request-atoms.server.ts
import { getCookie } from 'h3'
import { setRequestAtom } from '#effect-atom'
import { localeAtom, sessionAtom } from '~/atoms/request'

export default defineNuxtPlugin({
  name: 'request-atoms',
  hooks: {
    'effect-atom:setup': ({ registry, ssrContext }) => {
      if (!ssrContext) return
      setRequestAtom(registry, localeAtom, getCookie(ssrContext.event, 'locale') ?? 'en')
      setRequestAtom(registry, sessionAtom, readPublicSession(ssrContext.event))
    },
  },
})
```

Do authentication and authorization on the server. Only write public, browser-safe session data to a serializable atom.

## Layer lifetimes

Static layers passed to the generated `atomRuntime` are acquired once per Nitro process when `sharedMemoMap` is enabled. Their finalizers run from Nitro's process `close` hook.

```ts
export const runtime = atomRuntime(DatabaseLive)
```

A layer factory such as `atomRuntime(get => makeLayer(get))` may depend on the request registry, so the module deliberately leaves it request-scoped and records a diagnostic fallback. Use a static layer for pools and other process services. Disable sharing when a static layer itself needs request-local `AtomRegistry` or `Reactivity` services.

## Stable runtime and test imports

Nuxt application code should normally use `#effect-atom`, because that alias contains the module's configured runtime. Framework-independent modules and plain Vitest suites can use stable package subpaths:

```ts
import { atomRuntime, createAtomRuntime, setRequestAtom } from 'nuxt-effect-atom/runtime'
import {
  disposeServerRuntime,
  getEffectAtomDiagnostics,
  resetEffectAtomDiagnostics,
} from 'nuxt-effect-atom/testing'
```

`createAtomRuntime({ server: true })` is useful for deterministic server-lifecycle tests. Call `disposeServerRuntime()` in teardown when testing process-shared layers.

## Development diagnostics

Diagnostics are enabled by default and available from `useNuxtApp().$effectAtomDiagnostics`; the client also exposes `window.__effectAtomDiagnostics` for development inspection. The snapshot includes:

- registries created and disposed;
- atoms dehydrated and hydrated;
- cumulative serialized payload bytes;
- duplicate keys found in dehydrated or hydrated payload state;
- hydration-triggered refreshes skipped;
- reactive atoms that could not use the hydration-safe wrapper;
- process-layer builds, shutdowns, and dynamic-layer fallbacks.

The playground exposes the server snapshot from `/api/stats`. Development builds also warn when state is serialized and when a dynamic layer cannot use the process lifetime.

### Payload safety

Every serializable atom is embedded in the rendered Nuxt payload and therefore in the HTML sent to the browser. Never serialize access tokens, credentials, private authorization state, database records the current user may not see, or any other secret. Serialization is transport, not a security boundary.

## Options

```ts
export default defineNuxtConfig({
  effectAtom: {
    perRequestRegistry: true,
    hydrate: true,
    sharedMemoMap: true,
    ssrSuspense: true,
    autoImports: true,
    diagnostics: true,
    warnOnPayload: true,
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

The integration suite builds the playground and checks concurrent-request isolation, registry finalization, one-time layer acquisition, hydration without refetch, and client navigation. Unit tests separately verify hydration-safe reactivity and process-layer release.

`dist/` is committed because Git installs do not reliably run package build scripts. Run `pnpm prepack` after changing `src/`.
