import { AsyncResult, Atom, AtomRegistry } from '@effect/atom-vue'
import { Context, Effect, Layer, Schema } from 'effect'
import * as Hydration from 'effect/unstable/reactivity/Hydration'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createAtomRuntime,
  disposeServerRuntime,
  getEffectAtomDiagnostics,
  resetEffectAtomDiagnostics,
} from 'nuxt-effect-atom/testing'
import { rememberHydration } from '../src/runtime/diagnostics'

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
    const runtime = createAtomRuntime({ server: true, sharedMemoMap: true })
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
})

describe('hydration-safe reactivity', () => {
  beforeEach(() => resetEffectAtomDiagnostics())

  it('skips the hydration refetch and starts the source on invalidation', async () => {
    let reads = 0
    const runtime = createAtomRuntime({ hydrationSafeReactivity: true, server: false })
    const source = Atom.make(() => ++reads).pipe(
      Atom.serializable({ key: 'hydrated-counter', schema: Schema.Number }),
      runtime.withReactivity(['counter']),
    )

    const serverRegistry = AtomRegistry.make()
    serverRegistry.get(source)
    const state = Hydration.dehydrate(serverRegistry)
    serverRegistry.dispose()

    const clientRegistry = AtomRegistry.make()
    rememberHydration(clientRegistry, state)
    Hydration.hydrate(clientRegistry, state)
    const release = clientRegistry.mount(source)
    await waitFor(() => clientRegistry.get(source) === 1)

    expect(reads).toBe(1)
    expect(getEffectAtomDiagnostics().hydrationRefreshesSkipped).toBe(1)

    const invalidate = runtime(Layer.empty).fn(() => Effect.void, {
      reactivityKeys: ['counter'],
    })
    clientRegistry.set(invalidate, undefined)
    await Effect.runPromise(AtomRegistry.getResult(clientRegistry, invalidate, { suspendOnWaiting: true }))
    await waitFor(() => reads === 2)
    expect(reads).toBe(2)

    release()
    clientRegistry.dispose()
  })
})
