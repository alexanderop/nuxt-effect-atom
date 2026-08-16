import { defineNuxtModule, createResolver, addTemplate, addTypeTemplate, addPlugin, addImports } from '@nuxt/kit';

const module$1 = defineNuxtModule({
  meta: {
    name: "nuxt-effect-atom",
    configKey: "effectAtom",
    compatibility: { nuxt: ">=4.0.0" }
  },
  defaults: {
    perRequestRegistry: true,
    hydrate: true,
    sharedMemoMap: true,
    ssrSuspense: true,
    autoImports: true
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);
    const template = addTemplate({
      filename: "effect-atom-options.mjs",
      write: true,
      getContents: () => `export const options = ${JSON.stringify(options)}
`
    });
    addTypeTemplate({
      filename: "effect-atom-options.d.ts",
      getContents: () => `declare module '#effect-atom/options' {
  export const options: import('nuxt-effect-atom').ModuleOptions
}
`
    });
    nuxt.options.alias["#effect-atom/options"] = template.dst;
    nuxt.options.alias["#effect-atom"] = resolver.resolve("./runtime/index");
    nuxt.options.nitro.externals ||= {};
    nuxt.options.nitro.externals.inline ||= [];
    nuxt.options.nitro.externals.inline.push("effect", "@effect/atom-vue");
    addPlugin({ src: resolver.resolve("./runtime/plugin"), mode: "all" });
    if (options.autoImports) {
      addImports([
        { name: "atomRuntime", from: resolver.resolve("./runtime/runtime") },
        { name: "useAtomSuspense", from: resolver.resolve("./runtime/composables/useAtomSuspense") },
        { name: "useAtomRegistry", from: resolver.resolve("./runtime/composables/useAtomRegistry") },
        ...["useAtom", "useAtomValue", "useAtomSet", "useAtomRef"].map((name) => ({
          name,
          from: "@effect/atom-vue"
        }))
      ]);
    }
  }
});

export { module$1 as default };
