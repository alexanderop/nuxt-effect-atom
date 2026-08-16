# nuxt-effect-atom

A spike, not a release. The question it exists to answer: **is a Nuxt module for Effect Atom worth building, or is a docs page enough?**

The method: write the SSR glue by hand in `playground/`, get it working, then extract it into `src/runtime/` — and measure each extracted piece by switching it back off. Every scenario below runs the *same* application code. Only the module's behaviour changes.

```bash
pnpm install
pnpm dev                 # playground on :3000
node scripts/measure.mjs # the table below
```

## What was measured

`scripts/measure.mjs` boots the playground five times and probes it over HTTP.

| scenario | data in SSR HTML | atom in payload | wrong user rendered (of 10) | layer builds (per 20 req) |
| --- | --- | --- | --- | --- |
| module off | ✗ `loading…` | ✗ | 3 | 10 |
| **module on** | **✓** | **✓** | **0** | **0** |
| no per-request registry | ✓ | ✗ | 4 | 0 |
| no SSR suspense | ✗ `loading…` | ✗ | 0 | 5 |
| no shared MemoMap | ✓ | ✓ | 0 | 20 |
| registry only | ✓ | ✗ | 0 | 20 |

The last row is the important one for anyone deciding whether they need a module at all: **a per-request registry on its own is enough to be leak-free.** It costs you the payload (the client refetches what the server rendered) and a layer build per request, but nothing is shared between users.

Production build (`node playground/.output/server/index.mjs`): **1 layer build across 21 requests**, data in the HTML, atom in the payload.

Browser (`agent-browser`): **1 atom hydrated, 0 requests to `/api/notes` on load**. Without hydration the client refetches everything the server just rendered.

Two rows need a caveat so the table isn't over-read:

- `no per-request registry` reports no payload because the plugin skips hydration entirely when the registry is off — an implementation choice, not an independent result. Its real tell is `dbReads: 0` across 20 requests: with one shared registry the first request's data is cached and served forever.
- `no SSR suspense` reports 0 wrong users only because nothing awaits, so concurrent renders never interleave. The bug is still there; the scenario just doesn't have a window to expose it.

## What the module actually does

Four things, all of them SSR correctness rather than convenience.

**1. A registry per request** — `src/runtime/plugin.ts`

`@effect/atom-vue` resolves its registry with `inject(registryKey, defaultRegistry)`, where `defaultRegistry` is created at module scope. With no provide, every concurrent request on the server shares one registry. Measured: 3–4 renders out of 10 shipped another user's session value.

**2. Payload hydration** — `src/runtime/plugin.ts`

`Hydration.dehydrate` on `app:rendered`, `Hydration.hydrate` before mount. Core ships the primitives and React ships a `HydrationBoundary`; Vue ships neither. Values are already JSON-encoded by each atom's serializable schema, so the Nuxt payload needs no custom reducer.

**3. Awaiting an atom during SSR** — `src/runtime/composables/useAtomSuspense.ts`

This is the piece that turned out to be much worse than it looks from the outside, and the strongest argument for the module. Two separate problems:

- `useAtomValue` only subscribes, so an async atom is still `Initial` when the HTML is built.
- The subscription is dead on arrival. `useAtomValue` subscribes inside a default-flush `watchEffect`, and Vue's SSR path *stops such watchers immediately after creating them* — see `runsImmediately` in `doWatch`; only `flush: 'sync'` watchers get deferred cleanup via `__watcherHandles`. Stopping runs the cleanup, which unsubscribes from the registry. The ref receives exactly one synchronous read and never updates again, **even if you await the atom yourself**. The settled value has to be written back into the ref by hand.

There is a third, quieter one: because the watcher is dead the atom has no subscribers, so the registry schedules the node for removal and there is nothing left to dehydrate by `app:rendered`. The composable mounts the atom to hold it open for the request.

None of that is discoverable without reading Vue's SSR watch implementation.

**4. A process-shared layer MemoMap** — `src/runtime/runtime.ts`

`Atom.runtime` memoises built layers *per registry* (see the `eff-523-registry-scoped-atom-runtime` changeset, which also removed `Atom.defaultMemoMap`). Per-request registries therefore mean a per-request connection pool. `atomRuntime` is `Atom.context({ memoMap })` with one process-wide `Layer.MemoMap` on the server. Measured: 20 layer builds per 20 requests → 0.

## Open problem: `withReactivity` defeats hydration

`atomRuntime.withReactivity(['notes'])` is what you would write in a SPA. On a hydrated page it invalidates the atom as soon as it mounts on the client, discarding the value the server just sent. Measured: with it, 1 request to `/api/notes` on load; without it, 0.

The playground works around it by invalidating explicitly (`registry.refresh` in `pages/index.vue`). A real module would need either a `withReactivity` that skips its first refresh for a hydrated atom, or an upstream fix.

## What belongs upstream

Nothing in (1) or (2) is Nuxt-specific. A `RegistryPlugin` and a hydration helper for `@effect/atom-vue` — which today has a single empty test file — would make this module thinner and remove the risk of it being obsoleted. (3) is a Vue SSR problem, not a Nuxt one, and belongs there too. Only (4) and the build wiring are genuinely Nuxt's.

## Verdict

Worth building. The naive setup is not merely inconvenient — it renders loading states, serves one user's session data to another, refetches everything on hydration, and rebuilds the layer on every request. Four different failures, none of which announce themselves, and one of which is a data leak.

But most of the fix wants to live in `@effect/atom-vue`, so upstream first and keep the Nuxt module to the part that is actually about Nuxt.

## Layout

```
src/module.ts                                  options, virtual options module, aliases, autoimports
src/runtime/plugin.ts                          per-request registry + dehydrate/hydrate
src/runtime/runtime.ts                         atomRuntime (shared MemoMap on the server)
src/runtime/composables/useAtomSuspense.ts     SSR-aware read
playground/app/atoms/notes.ts                  the atoms
playground/shared/notes/                       domain, service, layers, fake db
scripts/measure.mjs                            the table above
```
