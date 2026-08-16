import { Atom } from '@effect/atom-vue';
import { Context, Layer } from 'effect';
import type { H3Event } from 'h3';
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
import type * as Reactivity from 'effect/unstable/reactivity/Reactivity';
export interface EffectAtomRequestContext {
    readonly server: boolean;
    readonly url: string;
    readonly requestId: string | undefined;
    readonly locale: string | undefined;
    readonly signal: AbortSignal;
    /** Present only during server rendering. Never serialize this value. */
    readonly event: H3Event | undefined;
}
declare const EffectAtomRequest_base: Context.ServiceClass<EffectAtomRequest, "@nuxt-effect-atom/Request", EffectAtomRequestContext>;
export declare class EffectAtomRequest extends EffectAtomRequest_base {
}
export declare const effectAtomRequestAtom: Atom.Writable<EffectAtomRequestContext, EffectAtomRequestContext>;
export declare const setEffectAtomRequestContext: (registry: AtomRegistry.AtomRegistry, context: EffectAtomRequestContext) => void;
export declare const getEffectAtomRequestContext: (registry: AtomRegistry.AtomRegistry) => EffectAtomRequestContext;
export declare const effectAtomRequestLayer: (context: EffectAtomRequestContext) => Layer.Layer<EffectAtomRequest>;
/** Provide the active Nuxt request to a request-scoped runtime layer. */
export declare const withEffectAtomRequest: <R, E>(layer: Layer.Layer<R, E, EffectAtomRequest | AtomRegistry.AtomRegistry | Reactivity.Reactivity>) => (get: Atom.AtomContext) => Layer.Layer<R, E, AtomRegistry.AtomRegistry | Reactivity.Reactivity>;
export {};
