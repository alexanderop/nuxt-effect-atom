import { AtomRegistry, registryKey } from "@effect/atom-vue";
import * as Hydration from "effect/unstable/reactivity/Hydration";
import { defineNuxtPlugin } from "#app";
import { options } from "#effect-atom/options";
export default defineNuxtPlugin({
  name: "nuxt-effect-atom",
  enforce: "pre",
  setup(nuxtApp) {
    if (!options.perRequestRegistry) return;
    const registry = AtomRegistry.make();
    nuxtApp.vueApp.provide(registryKey, registry);
    nuxtApp.$effectAtomRegistry = registry;
    if (!options.hydrate) return;
    if (import.meta.server) {
      nuxtApp.hook("app:rendered", () => {
        nuxtApp.payload.effectAtom = Hydration.dehydrate(registry);
      });
    } else {
      const state = nuxtApp.payload.effectAtom;
      if (import.meta.dev) {
        ;
        globalThis.__effectAtomHydrated = state?.length ?? 0;
      }
      if (state?.length) Hydration.hydrate(registry, state);
    }
  }
});
