import { options, runtimeKey } from '#effect-atom/options'
import {
  createAtomRuntime,
  createProcessAtomRuntime,
  createRequestAtomRuntime,
} from './public'
import { createEffectAtomSerializable } from './serialization'

const runtimeOptions = {
  hydrationSafeReactivity: options.hydrate,
  hydrationStaleTime: options.hydrationStaleTime,
}

/** Safe default for application, request, session, and browser-owned services. */
export const requestAtomRuntime = createRequestAtomRuntime(runtimeOptions)

/** Explicit process owner for fully provided pools, tracers, and infrastructure. */
export const processAtomRuntime = createProcessAtomRuntime({
  ...runtimeOptions,
  runtimeKey,
})

/**
 * @deprecated Lifetime inference is ambiguous. Migrate to `requestAtomRuntime`
 * or `processAtomRuntime`.
 */
export const atomRuntime = createAtomRuntime({
  ...runtimeOptions,
  sharedMemoMap: options.sharedMemoMap,
  runtimeKey,
})

export const effectAtomSerializable = createEffectAtomSerializable(options.duplicateKeyPolicy)
