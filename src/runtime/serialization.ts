import { Atom } from '@effect/atom-vue'
import type { Schema } from 'effect'
import { recordSerializationKeyConflict } from './diagnostics'

export const HydrationPolicyTypeId = '~nuxt-effect-atom/HydrationPolicy' as const

export interface HydrationPolicy {
  readonly staleTime: number | false
}

export interface EffectAtomSerializableOptions<S extends Schema.Constraint> {
  readonly key: string
  readonly schema: S
  /** Override the module-wide hydration freshness policy for this atom. */
  readonly staleTime?: number | false
}

export type HydrationPolicyAtom<A extends Atom.Atom<unknown>> = A & {
  readonly [HydrationPolicyTypeId]?: HydrationPolicy
}

interface SerializationGlobals {
  __nuxtEffectAtomSerializationKeys?: Map<string, WeakSet<object>>
}

const globals = globalThis as typeof globalThis & SerializationGlobals

const serializationKeys = (): Map<string, WeakSet<object>> =>
  globals.__nuxtEffectAtomSerializationKeys ??= new Map()

export const createEffectAtomSerializable = (
  duplicateKeyPolicy: 'warn' | 'error' = 'warn',
) =>
  <R extends Atom.Atom<unknown>, S extends Schema.ConstraintCodec<Atom.Type<R>, unknown>>(
    options: EffectAtomSerializableOptions<S>,
  ) =>
    (source: R): R & Atom.Serializable<S> & HydrationPolicyAtom<R> => {
      const owners = serializationKeys().get(options.key) ?? new WeakSet<object>()
      if (serializationKeys().has(options.key) && !owners.has(source)) {
        recordSerializationKeyConflict(options.key)
        const message = `[nuxt-effect-atom] Serialization key "${options.key}" is owned by more than one atom definition.`
        if (duplicateKeyPolicy === 'error') throw new Error(message)
        if (import.meta.dev) console.warn(message)
      }
      owners.add(source)
      serializationKeys().set(options.key, owners)

      const serializable = Atom.serializable(source, {
        key: options.key,
        schema: options.schema,
      })
      return Object.assign(serializable, options.staleTime === undefined
        ? {}
        : { [HydrationPolicyTypeId]: { staleTime: options.staleTime } })
    }

/** Standalone default. Nuxt's `#effect-atom` export applies the configured policy. */
export const effectAtomSerializable = createEffectAtomSerializable()

const hasHydrationPolicy = (
  atom: Atom.Atom<unknown>,
): atom is HydrationPolicyAtom<typeof atom> => HydrationPolicyTypeId in atom

export const hydrationPolicy = (atom: Atom.Atom<unknown>): HydrationPolicy | undefined =>
  hasHydrationPolicy(atom) ? atom[HydrationPolicyTypeId] : undefined
