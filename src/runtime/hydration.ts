import * as Hydration from 'effect/unstable/reactivity/Hydration'
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry'
import { rememberHydration } from './diagnostics'

export const EFFECT_ATOM_PAYLOAD_KEY = 'nuxt-effect-atom'

interface HydrationGlobals {
  __nuxtEffectAtomHydrationSafeKeys?: Set<string>
}

const globals = globalThis as typeof globalThis & HydrationGlobals

const hydrationSafeKeys = (): Set<string> =>
  globals.__nuxtEffectAtomHydrationSafeKeys ??= new Set()

export const registerHydrationSafeKey = (key: string): void => {
  hydrationSafeKeys().add(key)
}

export const isDehydratedState = (
  value: unknown,
): value is ReadonlyArray<Hydration.DehydratedAtom> => Array.isArray(value) && value.every(entry =>
  typeof entry === 'object'
  && entry !== null
  && Reflect.get(entry, '~effect/reactivity/DehydratedAtom') === true
  && typeof Reflect.get(entry, 'key') === 'string'
  && typeof Reflect.get(entry, 'dehydratedAt') === 'number')

export const hydrateRegistry = (
  registry: AtomRegistry.AtomRegistry,
  state: ReadonlyArray<Hydration.DehydratedAtom>,
  options: { readonly missingOnly?: boolean, readonly route?: boolean } = {},
): number => {
  const selected = options.missingOnly
    ? Hydration.toValues(state).filter(entry => !registry.getNodes().has(entry.key))
    : state
  if (selected.length === 0) return 0
  rememberHydration(registry, selected, { route: options.route })
  Hydration.hydrate(
    registry,
    Hydration.toValues(selected).filter(entry => !hydrationSafeKeys().has(entry.key)),
  )
  return selected.length
}
