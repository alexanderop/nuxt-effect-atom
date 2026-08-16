import { Atom } from '@effect/atom-vue'
import { Effect, Layer } from 'effect'
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry'
import type * as Reactivity from 'effect/unstable/reactivity/Reactivity'
import {
  queueStaleHydrationRefresh,
  recordDynamicLayerFallback,
  recordFreshHydration,
  recordHydrationRefreshSkipped,
  recordHydrationUnsafeReactivityAtom,
  recordStaleHydration,
  takeHydratedValue,
} from './diagnostics'
import { registerHydrationSafeKey } from './hydration'
import { processSharedLayer } from './process'
import { hydrationPolicy } from './serialization'

let dynamicLayerWarningShown = false
let unsafeReactivityWarningShown = false

export interface RuntimeOptions {
  readonly hydrationSafeReactivity?: boolean
  readonly hydrationStaleTime?: number | false
  /** Override Nuxt's platform detection in plain runtimes such as Vitest. */
  readonly server?: boolean
}

export interface AtomRuntimeOptions extends RuntimeOptions {
  /** @deprecated Prefer `createProcessAtomRuntime` for explicit process ownership. */
  readonly sharedMemoMap?: boolean
  readonly runtimeKey?: string
}

export interface ProcessAtomRuntimeOptions extends RuntimeOptions {
  /** Isolates process resources owned by separate Nitro applications. */
  readonly runtimeKey?: string
}

export interface ProcessAtomRuntimeFactory {
  <R, E>(create: Layer.Layer<R, E, never>): Atom.AtomRuntime<R, E>
  readonly addGlobalLayer: Atom.RuntimeFactory['addGlobalLayer']
  readonly withReactivity: Atom.RuntimeFactory['withReactivity']
}

/** Set one request-derived atom before SSR reads begin. */
export const setRequestAtom = <R, W>(
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Writable<R, W>,
  value: W,
): void => {
  registry.set(atom, value)
}

const withoutSerializableMetadata = <A extends Atom.Atom<unknown>>(source: A): A => {
  const clone = Object.create(Object.getPrototypeOf(source))
  for (const key of Reflect.ownKeys(source)) {
    if (key === Atom.SerializableTypeId) continue
    const descriptor = Object.getOwnPropertyDescriptor(source, key)
    if (descriptor !== undefined) Object.defineProperty(clone, key, descriptor)
  }
  return clone
}

function restoreAtomSubtype<A extends Atom.Atom<unknown>>(
  source: A,
  target: Atom.Atom<unknown>,
): A
function restoreAtomSubtype(
  _source: Atom.Atom<unknown>,
  target: Atom.Atom<unknown>,
): Atom.Atom<unknown> {
  return target
}

const decorateRuntimeFactory = (
  factory: Atom.RuntimeFactory,
  options: RuntimeOptions,
): Atom.RuntimeFactory => {
  const baseWithReactivity = factory.withReactivity
  return Object.assign(
    <R, E>(
      create:
        | Layer.Layer<R, E, AtomRegistry.AtomRegistry | Reactivity.Reactivity>
        | ((get: Atom.AtomContext) => Layer.Layer<R, E, AtomRegistry.AtomRegistry | Reactivity.Reactivity>),
    ): Atom.AtomRuntime<R, E> => factory(create),
    {
      addGlobalLayer: factory.addGlobalLayer,
      withReactivity: (
        keys: ReadonlyArray<unknown> | Readonly<Record<string, ReadonlyArray<unknown>>>,
      ) => <A extends Atom.Atom<unknown>>(source: A): A => {
        if (!options.hydrationSafeReactivity || !Atom.isSerializable(source)) {
          if (options.hydrationSafeReactivity && !Atom.isSerializable(source)) {
            recordHydrationUnsafeReactivityAtom()
            if (import.meta.dev && !unsafeReactivityWarningShown) {
              unsafeReactivityWarningShown = true
              console.warn(
                '[nuxt-effect-atom] withReactivity received a non-serializable atom, so hydration-safe refresh suppression cannot be applied. Put Atom.serializable before withReactivity.',
              )
            }
          }
          return baseWithReactivity(keys)(source)
        }

        const serializable = source[Atom.SerializableTypeId]
        registerHydrationSafeKey(serializable.key)
        const sourceWithoutSerialization = withoutSerializableMetadata(source)
        const hydratedRegistries = new WeakSet<AtomRegistry.AtomRegistry>()
        const revalidate = factory(Layer.empty).fn(() => Effect.void, {
          reactivityKeys: keys,
        })
        const hydrationGate = Atom.transform(sourceWithoutSerialization, (get, atom) => {
          const hydrated = takeHydratedValue(get.registry, serializable.key)
          if (hydrated !== undefined) {
            const staleTime = hydrationPolicy(source)?.staleTime ?? options.hydrationStaleTime ?? false
            const stale = staleTime !== false && Date.now() - hydrated.dehydratedAt >= staleTime
            if (stale) {
              recordStaleHydration()
              queueStaleHydrationRefresh(
                get.registry,
                () => get.registry.set(revalidate, undefined),
              )
            }
            else {
              hydratedRegistries.add(get.registry)
              recordFreshHydration()
              recordHydrationRefreshSkipped()
            }
            return serializable.decode(hydrated.encoded)
          }
          if (hydratedRegistries.delete(get.registry)) get.refresh(atom)
          get.subscribe(atom, value => get.setSelf(value))
          return get.once(atom)
        }, { initialValueTarget: sourceWithoutSerialization })
        // `Atom.transform` normally forwards refresh to its source. This gate
        // must invalidate itself first so its second read can install the
        // source subscription that hydration intentionally deferred.
        Object.defineProperty(hydrationGate, 'refresh', {
          configurable: true,
          enumerable: true,
          value: undefined,
          writable: true,
        })
        const reactiveSource = baseWithReactivity(keys)(hydrationGate)

        Object.assign(reactiveSource, {
          [Atom.SerializableTypeId]: serializable,
        })
        return restoreAtomSubtype(source, reactiveSource)
      },
    },
  )
}

/** Registry/request-scoped runtime. This is the safe default for application services. */
export const createRequestAtomRuntime = (options: RuntimeOptions = {}): Atom.RuntimeFactory =>
  decorateRuntimeFactory(Atom.context(), options)

/**
 * Process-scoped runtime for fully provided infrastructure layers.
 *
 * The `never` input requirement prevents request services from being captured
 * by a process-owned layer.
 */
export const createProcessAtomRuntime = (
  options: ProcessAtomRuntimeOptions = {},
): ProcessAtomRuntimeFactory => {
  const requestFactory = createRequestAtomRuntime(options)
  const processFactory = Object.assign(
    <R, E>(create: Layer.Layer<R, E, never>): Atom.AtomRuntime<R, E> => {
      const server = options.server ?? import.meta.server
      return requestFactory(server
        ? processSharedLayer(create, options.runtimeKey)
        : create)
    },
    {
      addGlobalLayer: requestFactory.addGlobalLayer,
      withReactivity: requestFactory.withReactivity,
    },
  )
  return processFactory
}

/**
 * @deprecated Lifetime inference is ambiguous. Use `createRequestAtomRuntime`
 * or `createProcessAtomRuntime` instead.
 */
export const createAtomRuntime = (options: AtomRuntimeOptions = {}): Atom.RuntimeFactory => {
  const requestFactory = createRequestAtomRuntime(options)

  return Object.assign(
    <R, E>(
      create:
        | Layer.Layer<R, E, AtomRegistry.AtomRegistry | Reactivity.Reactivity>
        | ((get: Atom.AtomContext) => Layer.Layer<R, E, AtomRegistry.AtomRegistry | Reactivity.Reactivity>),
    ): Atom.AtomRuntime<R, E> => {
      const server = options.server ?? import.meta.server
      if (!server || !options.sharedMemoMap) return requestFactory(create)
      recordDynamicLayerFallback()
      if (import.meta.dev && !dynamicLayerWarningShown) {
        dynamicLayerWarningShown = true
        console.warn(
          '[nuxt-effect-atom] Ambiguous legacy runtime layers now remain request-scoped. Migrate fully provided infrastructure to processAtomRuntime.',
        )
      }
      return requestFactory(create)
    },
    {
      addGlobalLayer: requestFactory.addGlobalLayer,
      withReactivity: requestFactory.withReactivity,
    },
  )
}

/** Standalone defaults for non-Nuxt consumers and tests. */
export const requestAtomRuntime = createRequestAtomRuntime()

/** Standalone process runtime. Nuxt's alias supplies an application-specific key. */
export const processAtomRuntime = createProcessAtomRuntime()

/** @deprecated Prefer `requestAtomRuntime` or `processAtomRuntime`. */
export const atomRuntime = createAtomRuntime()

export {
  EffectAtomRequest,
  effectAtomRequestAtom,
  effectAtomRequestLayer,
  getEffectAtomRequestContext,
  setEffectAtomRequestContext,
  withEffectAtomRequest,
} from './request'
export type { EffectAtomRequestContext } from './request'
export {
  createEffectAtomSerializable,
  effectAtomSerializable,
} from './serialization'
export type { EffectAtomSerializableOptions } from './serialization'
export { subscribeEffectAtomEvents } from './diagnostics'
export type { EffectAtomDiagnostics, EffectAtomEvent } from './diagnostics'
