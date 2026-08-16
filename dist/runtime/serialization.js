import { Atom } from "@effect/atom-vue";
import { recordSerializationKeyConflict } from "./diagnostics.js";
export const HydrationPolicyTypeId = "~nuxt-effect-atom/HydrationPolicy";
const globals = globalThis;
const serializationKeys = () => globals.__nuxtEffectAtomSerializationKeys ??= /* @__PURE__ */ new Map();
export const createEffectAtomSerializable = (duplicateKeyPolicy = "warn") => (options) => (source) => {
  const owners = serializationKeys().get(options.key) ?? /* @__PURE__ */ new WeakSet();
  if (serializationKeys().has(options.key) && !owners.has(source)) {
    recordSerializationKeyConflict(options.key);
    const message = `[nuxt-effect-atom] Serialization key "${options.key}" is owned by more than one atom definition.`;
    if (duplicateKeyPolicy === "error") throw new Error(message);
    if (import.meta.dev) console.warn(message);
  }
  owners.add(source);
  serializationKeys().set(options.key, owners);
  const serializable = Atom.serializable(source, {
    key: options.key,
    schema: options.schema
  });
  return Object.assign(serializable, options.staleTime === void 0 ? {} : { [HydrationPolicyTypeId]: { staleTime: options.staleTime } });
};
export const effectAtomSerializable = createEffectAtomSerializable();
const hasHydrationPolicy = (atom) => HydrationPolicyTypeId in atom;
export const hydrationPolicy = (atom) => hasHydrationPolicy(atom) ? atom[HydrationPolicyTypeId] : void 0;
