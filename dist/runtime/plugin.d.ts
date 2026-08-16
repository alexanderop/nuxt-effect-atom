import { AtomRegistry } from '@effect/atom-vue';
import { type EffectAtomDiagnostics, type EffectAtomEvent } from './diagnostics.js';
import { effectAtomRequestLayer, type EffectAtomRequestContext } from './request.js';
declare const _default: import("#app").Plugin<Record<string, unknown>> & import("#app").ObjectPlugin<Record<string, unknown>>;
export default _default;
declare module '#app' {
    interface RuntimeNuxtHooks {
        'effect-atom:setup': (context: {
            readonly nuxtApp: NuxtApp;
            readonly registry: AtomRegistry.AtomRegistry;
            readonly request: EffectAtomRequestContext;
            readonly requestLayer: ReturnType<typeof effectAtomRequestLayer>;
            readonly ssrContext: NuxtApp['ssrContext'];
        }) => void | Promise<void>;
        'effect-atom:registry:created': (context: {
            readonly registry: AtomRegistry.AtomRegistry;
        }) => void | Promise<void>;
        'effect-atom:registry:disposed': () => void | Promise<void>;
        'effect-atom:dehydrated': (context: {
            readonly atoms: number;
            readonly bytes: number;
            readonly atomBytes: Readonly<Record<string, number>>;
        }) => void | Promise<void>;
        'effect-atom:hydrated': (context: {
            readonly atoms: number;
            readonly route: boolean;
        }) => void | Promise<void>;
        'effect-atom:suspense:timeout': (context: {
            readonly timeout: number;
        }) => void | Promise<void>;
        'effect-atom:event': (event: EffectAtomEvent) => void | Promise<void>;
    }
    interface NuxtApp {
        $effectAtomRegistry: AtomRegistry.AtomRegistry;
        $effectAtomRequest: EffectAtomRequestContext;
        readonly $effectAtomDiagnostics: Readonly<EffectAtomDiagnostics>;
    }
}
