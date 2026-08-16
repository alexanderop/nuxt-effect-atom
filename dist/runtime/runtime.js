import { options, runtimeKey } from "#effect-atom/options";
import {
  createAtomRuntime,
  createProcessAtomRuntime,
  createRequestAtomRuntime
} from "./public.js";
import { createEffectAtomSerializable } from "./serialization.js";
const runtimeOptions = {
  hydrationSafeReactivity: options.hydrate,
  hydrationStaleTime: options.hydrationStaleTime
};
export const requestAtomRuntime = createRequestAtomRuntime(runtimeOptions);
export const processAtomRuntime = createProcessAtomRuntime({
  ...runtimeOptions,
  runtimeKey
});
export const atomRuntime = createAtomRuntime({
  ...runtimeOptions,
  sharedMemoMap: options.sharedMemoMap,
  runtimeKey
});
export const effectAtomSerializable = createEffectAtomSerializable(options.duplicateKeyPolicy);
