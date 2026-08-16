import { Atom } from '@effect/atom-vue'
import type { Layer } from 'effect'
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry'
import type * as Reactivity from 'effect/unstable/reactivity/Reactivity'
import {
  recordDynamicLayerFallback,
  recordHydrationRefreshSkipped,
  recordHydrationUnsafeReactivityAtom,
  takeHydratedValue,
} from './diagnostics'
import { processSharedLayer } from './process'

let dynamicLayerWarningShown = false
let unsafeReactivityWarningShown = false

export interface AtomRuntimeOptions {
  readonly sharedMemoMap?: boolean
  readonly hydrationSafeReactivity?: boolean
  /** Override Nuxt's platform detection in plain runtimes such as Vitest. */
  readonly server?: boolean
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

export const createAtomRuntime = (options: AtomRuntimeOptions = {}): Atom.RuntimeFactory => {
  const factory = Atom.context()

  const runtimeFactory: Atom.RuntimeFactory = Object.assign(
    <R, E>(
      create:
        | Layer.Layer<R, E, AtomRegistry.AtomRegistry | Reactivity.Reactivity>
        | ((get: Atom.AtomContext) => Layer.Layer<R, E, AtomRegistry.AtomRegistry | Reactivity.Reactivity>),
    ): Atom.AtomRuntime<R, E> => {
      const server = options.server ?? import.meta.server
      if (!server || !options.sharedMemoMap) return factory(create)
      if (typeof create === 'function') {
        recordDynamicLayerFallback()
        if (import.meta.dev && !dynamicLayerWarningShown) {
          dynamicLayerWarningShown = true
          console.warn(
            '[nuxt-effect-atom] A dynamic layer factory is request-scoped because it may depend on the request registry. Use a static layer for process-shared pools.',
          )
        }
        return factory(create)
      }
      return factory(processSharedLayer(create as Layer.Layer<R, E>))
    },
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
                '[nuxt-effect-atom] withReactivity received a non-serializable atom, so hydration-safe refresh suppression cannot be applied. Put Atom.serializable before atomRuntime.withReactivity.',
              )
            }
          }
          return factory.withReactivity(keys)(source)
        }

        const serializable = source[Atom.SerializableTypeId]
        // Serializable atoms are keyed globally by their serialization key. If both
        // the source and wrapper keep that metadata, the registry resolves the
        // wrapper back to itself. Keep the key on the public wrapper only.
        const sourceWithoutSerialization = withoutSerializableMetadata(source)
        const hydratedRegistries = new WeakSet<AtomRegistry.AtomRegistry>()
        const hydrationGate = Atom.transform(sourceWithoutSerialization, (get, atom) => {
          const hydrated = takeHydratedValue(get.registry, serializable.key)
          if (hydrated !== undefined) {
            hydratedRegistries.add(get.registry)
            recordHydrationRefreshSkipped()
            return serializable.decode(hydrated.encoded)
          }
          if (hydratedRegistries.delete(get.registry)) get.refresh(atom)
          get.subscribe(atom, value => get.setSelf(value))
          return get.once(atom)
        }, { initialValueTarget: sourceWithoutSerialization })
        const reactiveSource = factory.withReactivity(keys)(hydrationGate)

        Object.assign(reactiveSource, {
          [Atom.SerializableTypeId]: serializable,
        })
        return reactiveSource as unknown as A
      },
    },
  )

  return runtimeFactory
}

/**
 * Standalone defaults for non-Nuxt consumers and tests. Nuxt's `#effect-atom`
 * alias configures the same factory from module options.
 */
export const atomRuntime = createAtomRuntime()
