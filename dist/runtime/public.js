import { Atom } from "@effect/atom-vue";
import { Effect, Layer } from "effect";
import {
  queueStaleHydrationRefresh,
  recordDynamicLayerFallback,
  recordFreshHydration,
  recordHydrationRefreshSkipped,
  recordHydrationUnsafeReactivityAtom,
  recordStaleHydration,
  takeHydratedValue
} from "./diagnostics.js";
import { registerHydrationSafeKey } from "./hydration.js";
import { processSharedLayer } from "./process.js";
import { hydrationPolicy } from "./serialization.js";
let dynamicLayerWarningShown = false;
let unsafeReactivityWarningShown = false;
export const setRequestAtom = (registry, atom, value) => {
  registry.set(atom, value);
};
const withoutSerializableMetadata = (source) => {
  const clone = Object.create(Object.getPrototypeOf(source));
  for (const key of Reflect.ownKeys(source)) {
    if (key === Atom.SerializableTypeId) continue;
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (descriptor !== void 0) Object.defineProperty(clone, key, descriptor);
  }
  return clone;
};
function restoreAtomSubtype(_source, target) {
  return target;
}
const decorateRuntimeFactory = (factory, options) => {
  const baseWithReactivity = factory.withReactivity;
  return Object.assign(
    (create) => factory(create),
    {
      addGlobalLayer: factory.addGlobalLayer,
      withReactivity: (keys) => (source) => {
        if (!options.hydrationSafeReactivity || !Atom.isSerializable(source)) {
          if (options.hydrationSafeReactivity && !Atom.isSerializable(source)) {
            recordHydrationUnsafeReactivityAtom();
            if (import.meta.dev && !unsafeReactivityWarningShown) {
              unsafeReactivityWarningShown = true;
              console.warn(
                "[nuxt-effect-atom] withReactivity received a non-serializable atom, so hydration-safe refresh suppression cannot be applied. Put Atom.serializable before withReactivity."
              );
            }
          }
          return baseWithReactivity(keys)(source);
        }
        const serializable = source[Atom.SerializableTypeId];
        registerHydrationSafeKey(serializable.key);
        const sourceWithoutSerialization = withoutSerializableMetadata(source);
        const hydratedRegistries = /* @__PURE__ */ new WeakSet();
        const revalidate = factory(Layer.empty).fn(() => Effect.void, {
          reactivityKeys: keys
        });
        const hydrationGate = Atom.transform(sourceWithoutSerialization, (get, atom) => {
          const hydrated = takeHydratedValue(get.registry, serializable.key);
          if (hydrated !== void 0) {
            const staleTime = hydrationPolicy(source)?.staleTime ?? options.hydrationStaleTime ?? false;
            const stale = staleTime !== false && Date.now() - hydrated.dehydratedAt >= staleTime;
            if (stale) {
              recordStaleHydration();
              queueStaleHydrationRefresh(
                get.registry,
                () => get.registry.set(revalidate, void 0)
              );
            } else {
              hydratedRegistries.add(get.registry);
              recordFreshHydration();
              recordHydrationRefreshSkipped();
            }
            return serializable.decode(hydrated.encoded);
          }
          if (hydratedRegistries.delete(get.registry)) get.refresh(atom);
          get.subscribe(atom, (value) => get.setSelf(value));
          return get.once(atom);
        }, { initialValueTarget: sourceWithoutSerialization });
        Object.defineProperty(hydrationGate, "refresh", {
          configurable: true,
          enumerable: true,
          value: void 0,
          writable: true
        });
        const reactiveSource = baseWithReactivity(keys)(hydrationGate);
        Object.assign(reactiveSource, {
          [Atom.SerializableTypeId]: serializable
        });
        return restoreAtomSubtype(source, reactiveSource);
      }
    }
  );
};
export const createRequestAtomRuntime = (options = {}) => decorateRuntimeFactory(Atom.context(), options);
export const createProcessAtomRuntime = (options = {}) => {
  const requestFactory = createRequestAtomRuntime(options);
  const processFactory = Object.assign(
    (create) => {
      const server = options.server ?? import.meta.server;
      return requestFactory(server ? processSharedLayer(create, options.runtimeKey) : create);
    },
    {
      addGlobalLayer: requestFactory.addGlobalLayer,
      withReactivity: requestFactory.withReactivity
    }
  );
  return processFactory;
};
export const createAtomRuntime = (options = {}) => {
  const requestFactory = createRequestAtomRuntime(options);
  return Object.assign(
    (create) => {
      const server = options.server ?? import.meta.server;
      if (!server || !options.sharedMemoMap) return requestFactory(create);
      recordDynamicLayerFallback();
      if (import.meta.dev && !dynamicLayerWarningShown) {
        dynamicLayerWarningShown = true;
        console.warn(
          "[nuxt-effect-atom] Ambiguous legacy runtime layers now remain request-scoped. Migrate fully provided infrastructure to processAtomRuntime."
        );
      }
      return requestFactory(create);
    },
    {
      addGlobalLayer: requestFactory.addGlobalLayer,
      withReactivity: requestFactory.withReactivity
    }
  );
};
export const requestAtomRuntime = createRequestAtomRuntime();
export const processAtomRuntime = createProcessAtomRuntime();
export const atomRuntime = createAtomRuntime();
export {
  EffectAtomRequest,
  effectAtomRequestAtom,
  effectAtomRequestLayer,
  getEffectAtomRequestContext,
  setEffectAtomRequestContext,
  withEffectAtomRequest
} from "./request.js";
export {
  createEffectAtomSerializable,
  effectAtomSerializable
} from "./serialization.js";
export { subscribeEffectAtomEvents } from "./diagnostics.js";
