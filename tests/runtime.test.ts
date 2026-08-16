import { AsyncResult, Atom, AtomRegistry } from '@effect/atom-vue'
import { Context, Effect, Layer, Schema } from 'effect'
import * as Hydration from 'effect/unstable/reactivity/Hydration'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createAtomTestHarness,
  createEffectAtomSerializable,
  createProcessAtomRuntime,
  createRequestAtomRuntime,
  disposeServerRuntime,
  EffectAtomRequest,
  getEffectAtomDiagnostics,
  resetEffectAtomDiagnostics,
  setEffectAtomRequestContext,
  withEffectAtomRequest,
} from 'nuxt-effect-atom/testing'
import { flushStaleHydrationRefreshes } from '../src/runtime/diagnostics'
import { hydrateRegistry } from '../src/runtime/hydration'

const waitFor = async (predicate: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return
    await new Promise(resolve => setTimeout(resolve, 5))
  }
  throw new Error('Timed out waiting for atom state')
}

describe('runtime lifecycle', () => {
  beforeEach(async () => {
    await disposeServerRuntime()
    resetEffectAtomDiagnostics()
  })

  afterEach(() => disposeServerRuntime())

  it('keeps static layers process-shared until Nitro shutdown', async () => {
    let acquired = 0
    let released = 0

    class Resource extends Context.Service<Resource, { readonly id: number }>()('test/Resource') {}

    const resourceLayer = Layer.effect(
      Resource,
      Effect.acquireRelease(
        Effect.sync(() => ({ id: ++acquired })),
        () => Effect.sync(() => released++),
      ),
    )
    const runtime = createProcessAtomRuntime({ server: true, runtimeKey: 'process-lifecycle' })
    const resourceId = runtime(resourceLayer).atom(Effect.gen(function* () {
      return (yield* Resource).id
    }))

    for (let request = 0; request < 3; request++) {
      const registry = AtomRegistry.make()
      const release = registry.mount(resourceId)
      await waitFor(() => AsyncResult.isSuccess(registry.get(resourceId)))
      release()
      registry.dispose()
    }

    expect(acquired).toBe(1)
    expect(released).toBe(0)
    expect(getEffectAtomDiagnostics().processLayerBuilds).toBe(1)

    await disposeServerRuntime()
    expect(released).toBe(1)
    expect(getEffectAtomDiagnostics().processLayerDisposals).toBe(1)
  })

  it('isolates and disposes process runtimes by owner key', async () => {
    let acquired = 0
    let released = 0
    class Resource extends Context.Service<Resource, { readonly id: number }>()('test/OwnedResource') {}
    const layer = Layer.effect(
      Resource,
      Effect.acquireRelease(
        Effect.sync(() => ({ id: ++acquired })),
        () => Effect.sync(() => released++),
      ),
    )
    const first = createProcessAtomRuntime({ server: true, runtimeKey: 'first-app' })(layer)
    const second = createProcessAtomRuntime({ server: true, runtimeKey: 'second-app' })(layer)
    const id = (runtime: typeof first) => runtime.atom(Effect.gen(function* () {
      return (yield* Resource).id
    }))
    const firstRegistry = AtomRegistry.make()
    const secondRegistry = AtomRegistry.make()
    firstRegistry.mount(id(first))
    secondRegistry.mount(id(second))
    await waitFor(() => acquired === 2)

    await disposeServerRuntime('first-app')
    expect(released).toBe(1)
    await disposeServerRuntime('second-app')
    expect(released).toBe(2)
    firstRegistry.dispose()
    secondRegistry.dispose()
  })
})

describe('hydration-safe reactivity', () => {
  beforeEach(() => resetEffectAtomDiagnostics())

  it('skips the hydration refetch and starts the source on invalidation', async () => {
    let reads = 0
    const runtime = createRequestAtomRuntime({ hydrationSafeReactivity: true, server: false })
    const source = Atom.make(() => ++reads).pipe(
      Atom.serializable({ key: 'hydrated-counter', schema: Schema.Number }),
      runtime.withReactivity(['counter']),
    )

    const serverRegistry = AtomRegistry.make()
    serverRegistry.get(source)
    const state = Hydration.dehydrate(serverRegistry)
    serverRegistry.dispose()

    const clientRegistry = AtomRegistry.make()
    hydrateRegistry(clientRegistry, state)
    const release = clientRegistry.mount(source)
    await waitFor(() => clientRegistry.get(source) === 1)

    expect(reads).toBe(1)
    expect(getEffectAtomDiagnostics().hydrationRefreshesSkipped).toBe(1)

    const invalidate = runtime(Layer.empty).fn(() => Effect.void, {
      reactivityKeys: ['counter'],
    })
    clientRegistry.set(invalidate, undefined)
    await Effect.runPromise(AtomRegistry.getResult(clientRegistry, invalidate, { suspendOnWaiting: true }))
    await waitFor(() => reads === 2 && clientRegistry.get(source) === 2)
    expect(reads).toBe(2)

    release()
    clientRegistry.dispose()
  })

  it('renders stale hydration first and revalidates only after mount', async () => {
    let reads = 0
    const runtime = createRequestAtomRuntime({
      hydrationSafeReactivity: true,
      hydrationStaleTime: 0,
      server: false,
    })
    const source = Atom.make(() => ++reads).pipe(
      Atom.serializable({ key: 'stale-counter', schema: Schema.Number }),
      runtime.withReactivity(['stale-counter']),
    )

    const serverRegistry = AtomRegistry.make()
    serverRegistry.get(source)
    const state = Hydration.dehydrate(serverRegistry)
    serverRegistry.dispose()

    const clientRegistry = AtomRegistry.make()
    hydrateRegistry(clientRegistry, state)
    const release = clientRegistry.mount(source)
    expect(clientRegistry.get(source)).toBe(1)
    expect(reads).toBe(1)

    flushStaleHydrationRefreshes(clientRegistry)
    await waitFor(() => reads === 2)
    await waitFor(() => clientRegistry.get(source) === 2)
    expect(clientRegistry.get(source)).toBe(2)

    release()
    clientRegistry.dispose()
  })
})

describe('testing harness', () => {
  it('round-trips serializable state and disposes idempotently', () => {
    const countAtom = Atom.make(1).pipe(
      Atom.serializable({ key: 'harness-count', schema: Schema.Number }),
    )
    const source = createAtomTestHarness()
    source.set(countAtom, 2)
    const state = source.dehydrate()
    source.dispose()
    source.dispose()

    const target = createAtomTestHarness()
    target.hydrate(state)
    expect(target.get(countAtom)).toBe(2)
    target.dispose()
  })

  it('hydrates route payloads without overwriting live client nodes', () => {
    const existing = Atom.make(1).pipe(
      Atom.serializable({ key: 'route-existing', schema: Schema.Number }),
    )
    const routeOnly = Atom.make(2).pipe(
      Atom.serializable({ key: 'route-only', schema: Schema.Number }),
    )
    const server = createAtomTestHarness()
    server.get(existing)
    server.get(routeOnly)
    const state = server.dehydrate()
    server.dispose()

    const client = createAtomTestHarness()
    client.set(existing, 99)
    expect(hydrateRegistry(client.registry, state, { missingOnly: true, route: true })).toBe(1)
    expect(client.get(existing)).toBe(99)
    expect(client.get(routeOnly)).toBe(2)
    client.dispose()
  })

  it('can fail fast when two definitions declare one serialization key', () => {
    const serializable = createEffectAtomSerializable('error')
    const first = Atom.make(1)
    const second = Atom.make(2)
    serializable({ key: 'strict-duplicate-test', schema: Schema.Number })(first)

    expect(() => serializable({ key: 'strict-duplicate-test', schema: Schema.Number })(second))
      .toThrow('strict-duplicate-test')
  })

  it('provides typed request context only to request-scoped layers', async () => {
    class RequestUrl extends Context.Service<RequestUrl, string>()('test/RequestUrl') {}
    const requestLayer = Layer.effect(
      RequestUrl,
      Effect.gen(function* () {
        return (yield* EffectAtomRequest).url
      }),
    )
    const runtime = createRequestAtomRuntime({ server: true })(
      withEffectAtomRequest(requestLayer),
    )
    const urlAtom = runtime.atom(Effect.gen(function* () {
      return yield* RequestUrl
    }))
    const registry = AtomRegistry.make()
    setEffectAtomRequestContext(registry, {
      server: true,
      url: 'https://example.test/request',
      requestId: 'request-1',
      locale: 'en',
      signal: new AbortController().signal,
      event: undefined,
    })
    const release = registry.mount(urlAtom)
    await waitFor(() => AsyncResult.isSuccess(registry.get(urlAtom)))
    const result = registry.get(urlAtom)
    expect(AsyncResult.isSuccess(result) && result.value).toBe('https://example.test/request')
    release()
    registry.dispose()
  })
})
