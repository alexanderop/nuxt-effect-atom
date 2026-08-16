import type { Plugin } from 'vue'
import { AtomRegistry, registryKey } from '@effect/atom-vue'
import type { Atom } from '@effect/atom-vue'
import * as Hydration from 'effect/unstable/reactivity/Hydration'
import type { RegistryOptions } from '../module'
import { hydrateRegistry } from './hydration'
import {
  setEffectAtomRequestContext,
  type EffectAtomRequestContext,
} from './request'

export interface AtomTestHarness {
  readonly registry: AtomRegistry.AtomRegistry
  readonly get: <A>(atom: Atom.Atom<A>) => A
  readonly set: <R, W>(atom: Atom.Writable<R, W>, value: W) => void
  readonly mount: <A>(atom: Atom.Atom<A>) => () => void
  readonly dehydrate: () => ReadonlyArray<Hydration.DehydratedAtom>
  readonly hydrate: (state: ReadonlyArray<Hydration.DehydratedAtom>) => number
  readonly dispose: () => void
  readonly [Symbol.dispose]: () => void
}

export interface AtomTestHarnessOptions extends RegistryOptions {
  readonly initialValues?: Iterable<readonly [Atom.Atom<unknown>, unknown]>
  readonly request?: EffectAtomRequestContext
}

export const createAtomTestHarness = (
  options: AtomTestHarnessOptions = {},
): AtomTestHarness => {
  const registry = AtomRegistry.make({
    initialValues: options.initialValues,
    defaultIdleTTL: options.defaultIdleTTL,
    timeoutResolution: options.timeoutResolution,
  })
  if (options.request !== undefined) setEffectAtomRequestContext(registry, options.request)
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    registry.dispose()
  }
  return {
    registry,
    get: atom => registry.get(atom),
    set: (atom, value) => registry.set(atom, value),
    mount: atom => registry.mount(atom),
    dehydrate: () => Hydration.dehydrate(registry),
    hydrate: state => hydrateRegistry(registry, state),
    dispose,
    [Symbol.dispose]: dispose,
  }
}

export const createHydratedAtomTestHarness = (
  state: ReadonlyArray<Hydration.DehydratedAtom>,
  options: AtomTestHarnessOptions = {},
): AtomTestHarness => {
  const harness = createAtomTestHarness(options)
  harness.hydrate(state)
  return harness
}

export const withAtomTestHarness = async <A>(
  run: (harness: AtomTestHarness) => A | Promise<A>,
  options: AtomTestHarnessOptions = {},
): Promise<A> => {
  const harness = createAtomTestHarness(options)
  try {
    return await run(harness)
  }
  finally {
    harness.dispose()
  }
}

export const atomRegistryPlugin = (registry: AtomRegistry.AtomRegistry): Plugin => ({
  install: app => app.provide(registryKey, registry),
})
