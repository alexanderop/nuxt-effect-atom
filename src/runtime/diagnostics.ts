import type { AtomRegistry } from '@effect/atom-vue'
import * as Hydration from 'effect/unstable/reactivity/Hydration'

export interface EffectAtomDiagnostics {
  registriesCreated: number
  registriesDisposed: number
  dehydratedAtoms: number
  hydratedAtoms: number
  payloadBytes: number
  currentPayloadBytes: number
  largestPayloadBytes: number
  currentPayloadAtomBytes: Readonly<Record<string, number>>
  payloadWarnings: number
  payloadRejections: number
  duplicateSerializationKeys: Array<string>
  serializationKeyConflicts: Array<string>
  hydrationRefreshesSkipped: number
  freshHydrations: number
  staleHydrations: number
  routeHydrations: number
  hydrationUnsafeReactivityAtoms: number
  suspenseTimeouts: number
  processLayerBuilds: number
  processLayerDisposals: number
  dynamicLayerFallbacks: number
}

export type EffectAtomEvent
  = | { readonly type: 'registry:created' | 'registry:disposed' }
    | { readonly type: 'layer:acquired' | 'layer:disposed' }
    | { readonly type: 'hydrated', readonly atoms: number, readonly route: boolean }
    | { readonly type: 'dehydrated', readonly atoms: number, readonly bytes: number }
    | { readonly type: 'payload:warning' | 'payload:rejected', readonly bytes: number, readonly limit: number }
    | { readonly type: 'suspense:timeout', readonly timeout: number }

export interface PayloadDiagnostics {
  readonly bytes: number
  readonly atomBytes: Readonly<Record<string, number>>
}

interface HydratedValue {
  readonly found: true
  readonly encoded: unknown
  readonly dehydratedAt: number
}

interface EffectAtomGlobals {
  __nuxtEffectAtomDiagnostics?: EffectAtomDiagnostics
  __nuxtEffectAtomHydration?: WeakMap<AtomRegistry.AtomRegistry, Map<string, Omit<HydratedValue, 'found'>>>
  __nuxtEffectAtomStaleRefreshes?: WeakMap<AtomRegistry.AtomRegistry, Set<() => void>>
  __nuxtEffectAtomEventListeners?: Set<(event: EffectAtomEvent) => void>
  __effectAtomDiagnostics?: EffectAtomDiagnostics
}

const globals = globalThis as typeof globalThis & EffectAtomGlobals

const makeDiagnostics = (): EffectAtomDiagnostics => ({
  registriesCreated: 0,
  registriesDisposed: 0,
  dehydratedAtoms: 0,
  hydratedAtoms: 0,
  payloadBytes: 0,
  currentPayloadBytes: 0,
  largestPayloadBytes: 0,
  currentPayloadAtomBytes: {},
  payloadWarnings: 0,
  payloadRejections: 0,
  duplicateSerializationKeys: [],
  serializationKeyConflicts: [],
  hydrationRefreshesSkipped: 0,
  freshHydrations: 0,
  staleHydrations: 0,
  routeHydrations: 0,
  hydrationUnsafeReactivityAtoms: 0,
  suspenseTimeouts: 0,
  processLayerBuilds: 0,
  processLayerDisposals: 0,
  dynamicLayerFallbacks: 0,
})

const mutableDiagnostics = (): EffectAtomDiagnostics =>
  globals.__nuxtEffectAtomDiagnostics ??= makeDiagnostics()

const hydrationByRegistry = (): WeakMap<AtomRegistry.AtomRegistry, Map<string, Omit<HydratedValue, 'found'>>> =>
  globals.__nuxtEffectAtomHydration ??= new WeakMap()

const staleRefreshesByRegistry = (): WeakMap<AtomRegistry.AtomRegistry, Set<() => void>> =>
  globals.__nuxtEffectAtomStaleRefreshes ??= new WeakMap()

const eventListeners = (): Set<(event: EffectAtomEvent) => void> =>
  globals.__nuxtEffectAtomEventListeners ??= new Set()

const emit = (event: EffectAtomEvent): void => {
  for (const listener of eventListeners()) listener(event)
}

export const subscribeEffectAtomEvents = (listener: (event: EffectAtomEvent) => void): (() => void) => {
  eventListeners().add(listener)
  return () => eventListeners().delete(listener)
}

export const getEffectAtomDiagnostics = (): Readonly<EffectAtomDiagnostics> => ({
  ...mutableDiagnostics(),
  duplicateSerializationKeys: [...mutableDiagnostics().duplicateSerializationKeys],
  serializationKeyConflicts: [...mutableDiagnostics().serializationKeyConflicts],
  currentPayloadAtomBytes: { ...mutableDiagnostics().currentPayloadAtomBytes },
})

export const resetEffectAtomDiagnostics = (): void => {
  globals.__nuxtEffectAtomDiagnostics = makeDiagnostics()
  globals.__nuxtEffectAtomHydration = new WeakMap()
  globals.__nuxtEffectAtomStaleRefreshes = new WeakMap()
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
  emit({ type: 'registry:created' })
}

export const recordRegistryDisposed = (): void => {
  mutableDiagnostics().registriesDisposed++
  emit({ type: 'registry:disposed' })
}

export const recordProcessLayerBuild = (): void => {
  mutableDiagnostics().processLayerBuilds++
  emit({ type: 'layer:acquired' })
}

export const recordProcessLayerDisposal = (): void => {
  mutableDiagnostics().processLayerDisposals++
  emit({ type: 'layer:disposed' })
}

export const recordDynamicLayerFallback = (): void => {
  mutableDiagnostics().dynamicLayerFallbacks++
}

export const recordHydrationRefreshSkipped = (): void => {
  mutableDiagnostics().hydrationRefreshesSkipped++
}

export const recordFreshHydration = (): void => {
  mutableDiagnostics().freshHydrations++
}

export const recordStaleHydration = (): void => {
  mutableDiagnostics().staleHydrations++
}

export const recordHydrationUnsafeReactivityAtom = (): void => {
  mutableDiagnostics().hydrationUnsafeReactivityAtoms++
}

export const payloadByteLength = (state: ReadonlyArray<Hydration.DehydratedAtom>): number => {
  const json = JSON.stringify(state)
  return new TextEncoder().encode(json).byteLength
}

export const recordDehydration = (state: ReadonlyArray<Hydration.DehydratedAtom>): PayloadDiagnostics => {
  const diagnostics = mutableDiagnostics()
  const atomBytes = Object.fromEntries(Hydration.toValues(state).map(entry => [
    entry.key,
    new TextEncoder().encode(JSON.stringify(entry)).byteLength,
  ]))
  const bytes = payloadByteLength(state)
  diagnostics.dehydratedAtoms += state.length
  diagnostics.payloadBytes += bytes
  diagnostics.currentPayloadBytes = bytes
  diagnostics.largestPayloadBytes = Math.max(diagnostics.largestPayloadBytes, bytes)
  diagnostics.currentPayloadAtomBytes = atomBytes
  recordDuplicateKeys(state)
  emit({ type: 'dehydrated', atoms: state.length, bytes })
  return { bytes, atomBytes }
}

export const rememberHydration = (
  registry: AtomRegistry.AtomRegistry,
  state: ReadonlyArray<Hydration.DehydratedAtom>,
  options: { readonly route?: boolean } = {},
): void => {
  const values = new Map<string, Omit<HydratedValue, 'found'>>()
  for (const entry of Hydration.toValues(state)) {
    if (values.has(entry.key)) recordDuplicateKey(entry.key)
    values.set(entry.key, { encoded: entry.value, dehydratedAt: entry.dehydratedAt })
  }
  hydrationByRegistry().set(registry, values)
  mutableDiagnostics().hydratedAtoms += state.length
  if (options.route) mutableDiagnostics().routeHydrations++
  emit({ type: 'hydrated', atoms: state.length, route: options.route ?? false })
}

export const takeHydratedValue = (
  registry: AtomRegistry.AtomRegistry,
  key: string,
): HydratedValue | undefined => {
  const values = hydrationByRegistry().get(registry)
  if (values === undefined || !values.has(key)) return undefined
  const value = values.get(key)
  if (value === undefined) return undefined
  values.delete(key)
  if (values.size === 0) hydrationByRegistry().delete(registry)
  return { found: true, ...value }
}

export const queueStaleHydrationRefresh = (
  registry: AtomRegistry.AtomRegistry,
  refresh: () => void,
): void => {
  const refreshes = staleRefreshesByRegistry().get(registry) ?? new Set()
  refreshes.add(refresh)
  staleRefreshesByRegistry().set(registry, refreshes)
}

export const flushStaleHydrationRefreshes = (registry: AtomRegistry.AtomRegistry): void => {
  const refreshes = staleRefreshesByRegistry().get(registry)
  if (refreshes === undefined) return
  staleRefreshesByRegistry().delete(registry)
  for (const refresh of refreshes) refresh()
}

export const recordSerializationKeyConflict = (key: string): void => {
  const conflicts = mutableDiagnostics().serializationKeyConflicts
  if (!conflicts.includes(key)) conflicts.push(key)
}

export const recordPayloadWarning = (bytes: number, limit: number): void => {
  mutableDiagnostics().payloadWarnings++
  emit({ type: 'payload:warning', bytes, limit })
}

export const recordPayloadRejection = (bytes: number, limit: number): void => {
  mutableDiagnostics().payloadRejections++
  emit({ type: 'payload:rejected', bytes, limit })
}

export const recordSuspenseTimeout = (timeout: number): void => {
  mutableDiagnostics().suspenseTimeouts++
  emit({ type: 'suspense:timeout', timeout })
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
