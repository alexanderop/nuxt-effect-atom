import { Atom } from "@effect/atom-vue";
import {
  recordDynamicLayerFallback,
  recordHydrationRefreshSkipped,
  recordHydrationUnsafeReactivityAtom,
  takeHydratedValue
} from "./diagnostics.js";
import { processSharedLayer } from "./process.js";
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
export const createAtomRuntime = (options = {}) => {
  const factory = Atom.context();
  const runtimeFactory = Object.assign(
    (create) => {
      const server = options.server ?? import.meta.server;
      if (!server || !options.sharedMemoMap) return factory(create);
      if (typeof create === "function") {
        recordDynamicLayerFallback();
        if (import.meta.dev && !dynamicLayerWarningShown) {
          dynamicLayerWarningShown = true;
          console.warn(
            "[nuxt-effect-atom] A dynamic layer factory is request-scoped because it may depend on the request registry. Use a static layer for process-shared pools."
          );
        }
        return factory(create);
      }
      return factory(processSharedLayer(create));
    },
    {
      addGlobalLayer: factory.addGlobalLayer,
      withReactivity: (keys) => (source) => {
        if (!options.hydrationSafeReactivity || !Atom.isSerializable(source)) {
          if (options.hydrationSafeReactivity && !Atom.isSerializable(source)) {
            recordHydrationUnsafeReactivityAtom();
            if (import.meta.dev && !unsafeReactivityWarningShown) {
              unsafeReactivityWarningShown = true;
              console.warn(
                "[nuxt-effect-atom] withReactivity received a non-serializable atom, so hydration-safe refresh suppression cannot be applied. Put Atom.serializable before atomRuntime.withReactivity."
              );
            }
          }
          return factory.withReactivity(keys)(source);
        }
        const serializable = source[Atom.SerializableTypeId];
        const sourceWithoutSerialization = withoutSerializableMetadata(source);
        const hydratedRegistries = /* @__PURE__ */ new WeakSet();
        const hydrationGate = Atom.transform(sourceWithoutSerialization, (get, atom) => {
          const hydrated = takeHydratedValue(get.registry, serializable.key);
          if (hydrated !== void 0) {
            hydratedRegistries.add(get.registry);
            recordHydrationRefreshSkipped();
            return serializable.decode(hydrated.encoded);
          }
          if (hydratedRegistries.delete(get.registry)) get.refresh(atom);
          get.subscribe(atom, (value) => get.setSelf(value));
          return get.once(atom);
        }, { initialValueTarget: sourceWithoutSerialization });
        const reactiveSource = factory.withReactivity(keys)(hydrationGate);
        Object.assign(reactiveSource, {
          [Atom.SerializableTypeId]: serializable
        });
        return reactiveSource;
      }
    }
  );
  return runtimeFactory;
};
export const atomRuntime = createAtomRuntime();
