import type { AtomRegistry } from '@effect/atom-vue'
import * as Hydration from 'effect/unstable/reactivity/Hydration'

export interface EffectAtomDiagnostics {
  registriesCreated: number
  registriesDisposed: number
  dehydratedAtoms: number
  hydratedAtoms: number
  payloadBytes: number
  duplicateSerializationKeys: Array<string>
  hydrationRefreshesSkipped: number
  hydrationUnsafeReactivityAtoms: number
  processLayerBuilds: number
  processLayerDisposals: number
  dynamicLayerFallbacks: number
}

interface HydratedValue {
  readonly found: true
  readonly encoded: unknown
}

interface EffectAtomGlobals {
  __nuxtEffectAtomDiagnostics?: EffectAtomDiagnostics
  __nuxtEffectAtomHydration?: WeakMap<AtomRegistry.AtomRegistry, Map<string, unknown>>
  __effectAtomDiagnostics?: EffectAtomDiagnostics
}

const globals = globalThis as typeof globalThis & EffectAtomGlobals

const makeDiagnostics = (): EffectAtomDiagnostics => ({
  registriesCreated: 0,
  registriesDisposed: 0,
  dehydratedAtoms: 0,
  hydratedAtoms: 0,
  payloadBytes: 0,
  duplicateSerializationKeys: [],
  hydrationRefreshesSkipped: 0,
  hydrationUnsafeReactivityAtoms: 0,
  processLayerBuilds: 0,
  processLayerDisposals: 0,
  dynamicLayerFallbacks: 0,
})

const mutableDiagnostics = (): EffectAtomDiagnostics =>
  globals.__nuxtEffectAtomDiagnostics ??= makeDiagnostics()

const hydrationByRegistry = (): WeakMap<AtomRegistry.AtomRegistry, Map<string, unknown>> =>
  globals.__nuxtEffectAtomHydration ??= new WeakMap()

export const getEffectAtomDiagnostics = (): Readonly<EffectAtomDiagnostics> => ({
  ...mutableDiagnostics(),
  duplicateSerializationKeys: [...mutableDiagnostics().duplicateSerializationKeys],
})

export const resetEffectAtomDiagnostics = (): void => {
  globals.__nuxtEffectAtomDiagnostics = makeDiagnostics()
  globals.__nuxtEffectAtomHydration = new WeakMap()
  globals.__effectAtomDiagnostics = globals.__nuxtEffectAtomDiagnostics
}

export const exposeEffectAtomDiagnostics = (): void => {
  Object.defineProperty(globalThis, '__effectAtomDiagnostics', {
    configurable: true,
    enumerable: false,
    get: getEffectAtomDiagnostics,
  })
}

export const recordRegistryCreated = (): void => {
  mutableDiagnostics().registriesCreated++
}

export const recordRegistryDisposed = (): void => {
  mutableDiagnostics().registriesDisposed++
}

export const recordProcessLayerBuild = (): void => {
  mutableDiagnostics().processLayerBuilds++
}

export const recordProcessLayerDisposal = (): void => {
  mutableDiagnostics().processLayerDisposals++
}

export const recordDynamicLayerFallback = (): void => {
  mutableDiagnostics().dynamicLayerFallbacks++
}

export const recordHydrationRefreshSkipped = (): void => {
  mutableDiagnostics().hydrationRefreshesSkipped++
}

export const recordHydrationUnsafeReactivityAtom = (): void => {
  mutableDiagnostics().hydrationUnsafeReactivityAtoms++
}

export const payloadByteLength = (state: ReadonlyArray<Hydration.DehydratedAtom>): number => {
  const json = JSON.stringify(state)
  return new TextEncoder().encode(json).byteLength
}

export const recordDehydration = (state: ReadonlyArray<Hydration.DehydratedAtom>): void => {
  const diagnostics = mutableDiagnostics()
  diagnostics.dehydratedAtoms += state.length
  diagnostics.payloadBytes += payloadByteLength(state)
  recordDuplicateKeys(state)
}

export const rememberHydration = (
  registry: AtomRegistry.AtomRegistry,
  state: ReadonlyArray<Hydration.DehydratedAtom>,
): void => {
  const values = new Map<string, unknown>()
  for (const entry of Hydration.toValues(state)) {
    if (values.has(entry.key)) recordDuplicateKey(entry.key)
    values.set(entry.key, entry.value)
  }
  hydrationByRegistry().set(registry, values)
  mutableDiagnostics().hydratedAtoms += state.length
}

export const takeHydratedValue = (
  registry: AtomRegistry.AtomRegistry,
  key: string,
): HydratedValue | undefined => {
  const values = hydrationByRegistry().get(registry)
  if (values === undefined || !values.has(key)) return undefined
  const encoded = values.get(key)
  values.delete(key)
  if (values.size === 0) hydrationByRegistry().delete(registry)
  return { found: true, encoded }
}

const recordDuplicateKeys = (state: ReadonlyArray<Hydration.DehydratedAtom>): void => {
  const seen = new Set<string>()
  for (const entry of Hydration.toValues(state)) {
    if (seen.has(entry.key)) recordDuplicateKey(entry.key)
    seen.add(entry.key)
  }
}

const recordDuplicateKey = (key: string): void => {
  const keys = mutableDiagnostics().duplicateSerializationKeys
  if (!keys.includes(key)) keys.push(key)
}
