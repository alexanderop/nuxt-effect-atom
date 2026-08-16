import { AtomRegistry, registryKey } from "@effect/atom-vue";
import * as Hydration from "effect/unstable/reactivity/Hydration";
import { hydrateRegistry } from "./hydration.js";
import {
  setEffectAtomRequestContext
} from "./request.js";
export const createAtomTestHarness = (options = {}) => {
  const registry = AtomRegistry.make({
    initialValues: options.initialValues,
    defaultIdleTTL: options.defaultIdleTTL,
    timeoutResolution: options.timeoutResolution
  });
  if (options.request !== void 0) setEffectAtomRequestContext(registry, options.request);
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    registry.dispose();
  };
  return {
    registry,
    get: (atom) => registry.get(atom),
    set: (atom, value) => registry.set(atom, value),
    mount: (atom) => registry.mount(atom),
    dehydrate: () => Hydration.dehydrate(registry),
    hydrate: (state) => hydrateRegistry(registry, state),
    dispose,
    [Symbol.dispose]: dispose
  };
};
export const createHydratedAtomTestHarness = (state, options = {}) => {
  const harness = createAtomTestHarness(options);
  harness.hydrate(state);
  return harness;
};
export const withAtomTestHarness = async (run, options = {}) => {
  const harness = createAtomTestHarness(options);
  try {
    return await run(harness);
  } finally {
    harness.dispose();
  }
};
export const atomRegistryPlugin = (registry) => ({
  install: (app) => app.provide(registryKey, registry)
});
