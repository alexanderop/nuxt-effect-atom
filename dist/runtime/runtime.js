import { options } from "#effect-atom/options";
import { createAtomRuntime } from "./public.js";
export const atomRuntime = createAtomRuntime({
  sharedMemoMap: options.sharedMemoMap,
  hydrationSafeReactivity: options.hydrate
});
