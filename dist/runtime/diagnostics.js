import * as Hydration from "effect/unstable/reactivity/Hydration";
const globals = globalThis;
const makeDiagnostics = () => ({
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
  dynamicLayerFallbacks: 0
});
const mutableDiagnostics = () => globals.__nuxtEffectAtomDiagnostics ??= makeDiagnostics();
const hydrationByRegistry = () => globals.__nuxtEffectAtomHydration ??= /* @__PURE__ */ new WeakMap();
const staleRefreshesByRegistry = () => globals.__nuxtEffectAtomStaleRefreshes ??= /* @__PURE__ */ new WeakMap();
const eventListeners = () => globals.__nuxtEffectAtomEventListeners ??= /* @__PURE__ */ new Set();
const emit = (event) => {
  for (const listener of eventListeners()) listener(event);
};
export const subscribeEffectAtomEvents = (listener) => {
  eventListeners().add(listener);
  return () => eventListeners().delete(listener);
};
export const getEffectAtomDiagnostics = () => ({
  ...mutableDiagnostics(),
  duplicateSerializationKeys: [...mutableDiagnostics().duplicateSerializationKeys],
  serializationKeyConflicts: [...mutableDiagnostics().serializationKeyConflicts],
  currentPayloadAtomBytes: { ...mutableDiagnostics().currentPayloadAtomBytes }
});
export const resetEffectAtomDiagnostics = () => {
  globals.__nuxtEffectAtomDiagnostics = makeDiagnostics();
  globals.__nuxtEffectAtomHydration = /* @__PURE__ */ new WeakMap();
  globals.__nuxtEffectAtomStaleRefreshes = /* @__PURE__ */ new WeakMap();
  globals.__effectAtomDiagnostics = globals.__nuxtEffectAtomDiagnostics;
};
export const exposeEffectAtomDiagnostics = () => {
  Object.defineProperty(globalThis, "__effectAtomDiagnostics", {
    configurable: true,
    enumerable: false,
    get: getEffectAtomDiagnostics
  });
};
export const recordRegistryCreated = () => {
  mutableDiagnostics().registriesCreated++;
  emit({ type: "registry:created" });
};
export const recordRegistryDisposed = () => {
  mutableDiagnostics().registriesDisposed++;
  emit({ type: "registry:disposed" });
};
export const recordProcessLayerBuild = () => {
  mutableDiagnostics().processLayerBuilds++;
  emit({ type: "layer:acquired" });
};
export const recordProcessLayerDisposal = () => {
  mutableDiagnostics().processLayerDisposals++;
  emit({ type: "layer:disposed" });
};
export const recordDynamicLayerFallback = () => {
  mutableDiagnostics().dynamicLayerFallbacks++;
};
export const recordHydrationRefreshSkipped = () => {
  mutableDiagnostics().hydrationRefreshesSkipped++;
};
export const recordFreshHydration = () => {
  mutableDiagnostics().freshHydrations++;
};
export const recordStaleHydration = () => {
  mutableDiagnostics().staleHydrations++;
};
export const recordHydrationUnsafeReactivityAtom = () => {
  mutableDiagnostics().hydrationUnsafeReactivityAtoms++;
};
export const payloadByteLength = (state) => {
  const json = JSON.stringify(state);
  return new TextEncoder().encode(json).byteLength;
};
export const recordDehydration = (state) => {
  const diagnostics = mutableDiagnostics();
  const atomBytes = Object.fromEntries(Hydration.toValues(state).map((entry) => [
    entry.key,
    new TextEncoder().encode(JSON.stringify(entry)).byteLength
  ]));
  const bytes = payloadByteLength(state);
  diagnostics.dehydratedAtoms += state.length;
  diagnostics.payloadBytes += bytes;
  diagnostics.currentPayloadBytes = bytes;
  diagnostics.largestPayloadBytes = Math.max(diagnostics.largestPayloadBytes, bytes);
  diagnostics.currentPayloadAtomBytes = atomBytes;
  recordDuplicateKeys(state);
  emit({ type: "dehydrated", atoms: state.length, bytes });
  return { bytes, atomBytes };
};
export const rememberHydration = (registry, state, options = {}) => {
  const values = /* @__PURE__ */ new Map();
  for (const entry of Hydration.toValues(state)) {
    if (values.has(entry.key)) recordDuplicateKey(entry.key);
    values.set(entry.key, { encoded: entry.value, dehydratedAt: entry.dehydratedAt });
  }
  hydrationByRegistry().set(registry, values);
  mutableDiagnostics().hydratedAtoms += state.length;
  if (options.route) mutableDiagnostics().routeHydrations++;
  emit({ type: "hydrated", atoms: state.length, route: options.route ?? false });
};
export const takeHydratedValue = (registry, key) => {
  const values = hydrationByRegistry().get(registry);
  if (values === void 0 || !values.has(key)) return void 0;
  const value = values.get(key);
  if (value === void 0) return void 0;
  values.delete(key);
  if (values.size === 0) hydrationByRegistry().delete(registry);
  return { found: true, ...value };
};
export const queueStaleHydrationRefresh = (registry, refresh) => {
  const refreshes = staleRefreshesByRegistry().get(registry) ?? /* @__PURE__ */ new Set();
  refreshes.add(refresh);
  staleRefreshesByRegistry().set(registry, refreshes);
};
export const flushStaleHydrationRefreshes = (registry) => {
  const refreshes = staleRefreshesByRegistry().get(registry);
  if (refreshes === void 0) return;
  staleRefreshesByRegistry().delete(registry);
  for (const refresh of refreshes) refresh();
};
export const recordSerializationKeyConflict = (key) => {
  const conflicts = mutableDiagnostics().serializationKeyConflicts;
  if (!conflicts.includes(key)) conflicts.push(key);
};
export const recordPayloadWarning = (bytes, limit) => {
  mutableDiagnostics().payloadWarnings++;
  emit({ type: "payload:warning", bytes, limit });
};
export const recordPayloadRejection = (bytes, limit) => {
  mutableDiagnostics().payloadRejections++;
  emit({ type: "payload:rejected", bytes, limit });
};
export const recordSuspenseTimeout = (timeout) => {
  mutableDiagnostics().suspenseTimeouts++;
  emit({ type: "suspense:timeout", timeout });
};
const recordDuplicateKeys = (state) => {
  const seen = /* @__PURE__ */ new Set();
  for (const entry of Hydration.toValues(state)) {
    if (seen.has(entry.key)) recordDuplicateKey(entry.key);
    seen.add(entry.key);
  }
};
const recordDuplicateKey = (key) => {
  const keys = mutableDiagnostics().duplicateSerializationKeys;
  if (!keys.includes(key)) keys.push(key);
};
