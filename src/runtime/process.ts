import { Effect, Exit, Layer, Scope } from 'effect'
import {
  recordProcessLayerBuild,
  recordProcessLayerDisposal,
} from './diagnostics'

interface ProcessLayerState {
  readonly scope: Scope.Closeable
  readonly memoMap: Layer.MemoMap
  disposePromise?: Promise<void>
}

interface EffectAtomProcessGlobals {
  __nuxtEffectAtomProcessLayers?: ProcessLayerState
}

const globals = globalThis as typeof globalThis & EffectAtomProcessGlobals

const makeState = (): ProcessLayerState => ({
  scope: Scope.makeUnsafe(),
  memoMap: Layer.makeMemoMapUnsafe(),
})

const state = (): ProcessLayerState =>
  globals.__nuxtEffectAtomProcessLayers ??= makeState()

export const processSharedLayer = <R, E>(layer: Layer.Layer<R, E>): Layer.Layer<R, E> => {
  const current = state()
  const build = Layer.buildWithMemoMap(layer, current.memoMap, current.scope).pipe(
    Effect.tap(() => Effect.sync(recordProcessLayerBuild)),
  )
  const cachedBuild = Effect.runSync(Effect.cached(build))
  return Layer.effectContext(cachedBuild)
}

export const disposeServerRuntime = (): Promise<void> => {
  const current = globals.__nuxtEffectAtomProcessLayers
  if (current === undefined) return Promise.resolve()
  if (current.disposePromise !== undefined) return current.disposePromise
  current.disposePromise = Effect.runPromise(Scope.close(current.scope, Exit.void)).then(() => {
    recordProcessLayerDisposal()
    if (globals.__nuxtEffectAtomProcessLayers === current) {
      globals.__nuxtEffectAtomProcessLayers = undefined
    }
  })
  return current.disposePromise
}
