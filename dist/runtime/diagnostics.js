import * as Hydration from "effect/unstable/reactivity/Hydration";
const globals = globalThis;
const makeDiagnostics = () => ({
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
  dynamicLayerFallbacks: 0
});
const mutableDiagnostics = () => globals.__nuxtEffectAtomDiagnostics ??= makeDiagnostics();
const hydrationByRegistry = () => globals.__nuxtEffectAtomHydration ??= /* @__PURE__ */ new WeakMap();
export const getEffectAtomDiagnostics = () => ({
  ...mutableDiagnostics(),
  duplicateSerializationKeys: [...mutableDiagnostics().duplicateSerializationKeys]
});
export const resetEffectAtomDiagnostics = () => {
  globals.__nuxtEffectAtomDiagnostics = makeDiagnostics();
  globals.__nuxtEffectAtomHydration = /* @__PURE__ */ new WeakMap();
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
};
export const recordRegistryDisposed = () => {
  mutableDiagnostics().registriesDisposed++;
};
export const recordProcessLayerBuild = () => {
  mutableDiagnostics().processLayerBuilds++;
};
export const recordProcessLayerDisposal = () => {
  mutableDiagnostics().processLayerDisposals++;
};
export const recordDynamicLayerFallback = () => {
  mutableDiagnostics().dynamicLayerFallbacks++;
};
export const recordHydrationRefreshSkipped = () => {
  mutableDiagnostics().hydrationRefreshesSkipped++;
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
  diagnostics.dehydratedAtoms += state.length;
  diagnostics.payloadBytes += payloadByteLength(state);
  recordDuplicateKeys(state);
};
export const rememberHydration = (registry, state) => {
  const values = /* @__PURE__ */ new Map();
  for (const entry of Hydration.toValues(state)) {
    if (values.has(entry.key)) recordDuplicateKey(entry.key);
    values.set(entry.key, entry.value);
  }
  hydrationByRegistry().set(registry, values);
  mutableDiagnostics().hydratedAtoms += state.length;
};
export const takeHydratedValue = (registry, key) => {
  const values = hydrationByRegistry().get(registry);
  if (values === void 0 || !values.has(key)) return void 0;
  const encoded = values.get(key);
  values.delete(key);
  if (values.size === 0) hydrationByRegistry().delete(registry);
  return { found: true, encoded };
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
