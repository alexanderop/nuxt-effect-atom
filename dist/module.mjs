import { addCustomTab } from '@nuxt/devtools-kit';
import { defineNuxtModule, createResolver, addTemplate, addTypeTemplate, addPlugin, addServerPlugin, addServerHandler, addImports } from '@nuxt/kit';

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
    autoImports: true,
    diagnostics: true,
    warnOnPayload: true,
    warnPayloadBytes: 65536,
    maxPayloadBytes: false,
    duplicateKeyPolicy: "warn",
    hydrationStaleTime: false,
    routePayloadHydration: true,
    ssrSuspenseTimeout: 15e3,
    ssrSuspenseTimeoutMode: "render-loading",
    registry: {},
    devtools: true
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);
    const runtimeKey = `${nuxt.options.rootDir}:${nuxt.options.appId}`;
    const template = addTemplate({
      filename: "effect-atom-options.mjs",
      write: true,
      getContents: () => `export const options = ${JSON.stringify(options)}
export const runtimeKey = ${JSON.stringify(runtimeKey)}
`
    });
    addTypeTemplate({
      filename: "effect-atom-options.d.ts",
      getContents: () => `declare module '#effect-atom/options' {
  export const options: import('nuxt-effect-atom').ModuleOptions
  export const runtimeKey: string
}
`
    });
    nuxt.options.alias["#effect-atom/options"] = template.dst;
    nuxt.options.alias["#effect-atom"] = resolver.resolve("./runtime/index");
    nuxt.options.nitro.externals ||= {};
    nuxt.options.nitro.externals.inline ||= [];
    nuxt.options.nitro.externals.inline.push("effect", "@effect/atom-vue");
    addPlugin({ src: resolver.resolve("./runtime/plugin"), mode: "all" });
    addServerPlugin(resolver.resolve("./runtime/server/nitro-plugin"));
    if (nuxt.options.dev && options.devtools) {
      addServerHandler({
        route: "/__effect-atom/diagnostics",
        handler: resolver.resolve("./runtime/server/diagnostics-handler")
      });
      addServerHandler({
        route: "/__effect-atom/devtools",
        handler: resolver.resolve("./runtime/server/devtools-handler")
      });
      addCustomTab({
        name: "effect-atom",
        title: "Effect Atom",
        icon: "i-logos-effect",
        category: "modules",
        view: {
          type: "iframe",
          src: "/__effect-atom/devtools"
        }
      }, nuxt);
    }
    if (options.autoImports) {
      addImports([
        { name: "atomRuntime", from: resolver.resolve("./runtime/runtime") },
        { name: "requestAtomRuntime", from: resolver.resolve("./runtime/runtime") },
        { name: "processAtomRuntime", from: resolver.resolve("./runtime/runtime") },
        { name: "effectAtomSerializable", from: resolver.resolve("./runtime/serialization") },
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
