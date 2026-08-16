import * as Hydration from "effect/unstable/reactivity/Hydration";
import { rememberHydration } from "./diagnostics.js";
export const EFFECT_ATOM_PAYLOAD_KEY = "nuxt-effect-atom";
const globals = globalThis;
const hydrationSafeKeys = () => globals.__nuxtEffectAtomHydrationSafeKeys ??= /* @__PURE__ */ new Set();
export const registerHydrationSafeKey = (key) => {
  hydrationSafeKeys().add(key);
};
export const isDehydratedState = (value) => Array.isArray(value) && value.every((entry) => typeof entry === "object" && entry !== null && Reflect.get(entry, "~effect/reactivity/DehydratedAtom") === true && typeof Reflect.get(entry, "key") === "string" && typeof Reflect.get(entry, "dehydratedAt") === "number");
export const hydrateRegistry = (registry, state, options = {}) => {
  const selected = options.missingOnly ? Hydration.toValues(state).filter((entry) => !registry.getNodes().has(entry.key)) : state;
  if (selected.length === 0) return 0;
  rememberHydration(registry, selected, { route: options.route });
  Hydration.hydrate(
    registry,
    Hydration.toValues(selected).filter((entry) => !hydrationSafeKeys().has(entry.key))
  );
  return selected.length;
};
