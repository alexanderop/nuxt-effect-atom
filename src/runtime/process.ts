import { Effect, Exit, Layer, Scope } from 'effect'
import {
  recordProcessLayerBuild,
  recordProcessLayerDisposal,
} from './diagnostics'

interface ProcessLayerState {
  readonly scope: Scope.Closeable
  readonly memoMap: Layer.MemoMap
  readonly builtLayers: WeakSet<object>
  disposePromise?: Promise<void>
}

interface EffectAtomProcessGlobals {
  __nuxtEffectAtomProcessLayers?: Map<string, ProcessLayerState>
}

const globals = globalThis as typeof globalThis & EffectAtomProcessGlobals

const makeState = (): ProcessLayerState => ({
  scope: Scope.makeUnsafe(),
  memoMap: Layer.makeMemoMapUnsafe(),
  builtLayers: new WeakSet(),
})

const states = (): Map<string, ProcessLayerState> =>
  globals.__nuxtEffectAtomProcessLayers ??= new Map()

const state = (runtimeKey: string): ProcessLayerState => {
  const current = states().get(runtimeKey)
  if (current !== undefined && current.disposePromise === undefined) return current
  const created = makeState()
  states().set(runtimeKey, created)
  return created
}

export const processSharedLayer = <R, E>(
  layer: Layer.Layer<R, E, never>,
  runtimeKey = 'standalone',
): Layer.Layer<R, E> => {
  const current = state(runtimeKey)
  const build = Layer.buildWithMemoMap(layer, current.memoMap, current.scope).pipe(
    Effect.tap(() => Effect.sync(() => {
      if (current.builtLayers.has(layer)) return
      current.builtLayers.add(layer)
      recordProcessLayerBuild()
    })),
  )
  const cachedBuild = Effect.runSync(Effect.cached(build))
  return Layer.effectContext(cachedBuild)
}

const disposeState = (runtimeKey: string, current: ProcessLayerState): Promise<void> => {
  if (current.disposePromise !== undefined) return current.disposePromise
  current.disposePromise = Effect.runPromise(Scope.close(current.scope, Exit.void)).then(() => {
    recordProcessLayerDisposal()
    if (globals.__nuxtEffectAtomProcessLayers?.get(runtimeKey) === current) {
      globals.__nuxtEffectAtomProcessLayers.delete(runtimeKey)
    }
  })
  return current.disposePromise
}

export const disposeServerRuntime = (runtimeKey?: string): Promise<void> => {
  const currentStates = globals.__nuxtEffectAtomProcessLayers
  if (currentStates === undefined) return Promise.resolve()
  if (runtimeKey !== undefined) {
    const current = currentStates.get(runtimeKey)
    return current === undefined ? Promise.resolve() : disposeState(runtimeKey, current)
  }
  return Promise.all(
    Array.from(currentStates, ([key, current]) => disposeState(key, current)),
  ).then(() => undefined)
}
