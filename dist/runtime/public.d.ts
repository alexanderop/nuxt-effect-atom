import { Atom } from '@effect/atom-vue';
import { Layer } from 'effect';
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
export interface RuntimeOptions {
    readonly hydrationSafeReactivity?: boolean;
    readonly hydrationStaleTime?: number | false;
    /** Override Nuxt's platform detection in plain runtimes such as Vitest. */
    readonly server?: boolean;
}
export interface AtomRuntimeOptions extends RuntimeOptions {
    /** @deprecated Prefer `createProcessAtomRuntime` for explicit process ownership. */
    readonly sharedMemoMap?: boolean;
    readonly runtimeKey?: string;
}
export interface ProcessAtomRuntimeOptions extends RuntimeOptions {
    /** Isolates process resources owned by separate Nitro applications. */
    readonly runtimeKey?: string;
}
export interface ProcessAtomRuntimeFactory {
    <R, E>(create: Layer.Layer<R, E, never>): Atom.AtomRuntime<R, E>;
    readonly addGlobalLayer: Atom.RuntimeFactory['addGlobalLayer'];
    readonly withReactivity: Atom.RuntimeFactory['withReactivity'];
}
/** Set one request-derived atom before SSR reads begin. */
export declare const setRequestAtom: <R, W>(registry: AtomRegistry.AtomRegistry, atom: Atom.Writable<R, W>, value: W) => void;
/** Registry/request-scoped runtime. This is the safe default for application services. */
export declare const createRequestAtomRuntime: (options?: RuntimeOptions) => Atom.RuntimeFactory;
/**
 * Process-scoped runtime for fully provided infrastructure layers.
 *
 * The `never` input requirement prevents request services from being captured
 * by a process-owned layer.
 */
export declare const createProcessAtomRuntime: (options?: ProcessAtomRuntimeOptions) => ProcessAtomRuntimeFactory;
/**
 * @deprecated Lifetime inference is ambiguous. Use `createRequestAtomRuntime`
 * or `createProcessAtomRuntime` instead.
 */
export declare const createAtomRuntime: (options?: AtomRuntimeOptions) => Atom.RuntimeFactory;
/** Standalone defaults for non-Nuxt consumers and tests. */
export declare const requestAtomRuntime: Atom.RuntimeFactory;
/** Standalone process runtime. Nuxt's alias supplies an application-specific key. */
export declare const processAtomRuntime: ProcessAtomRuntimeFactory;
/** @deprecated Prefer `requestAtomRuntime` or `processAtomRuntime`. */
export declare const atomRuntime: Atom.RuntimeFactory;
export { EffectAtomRequest, effectAtomRequestAtom, effectAtomRequestLayer, getEffectAtomRequestContext, setEffectAtomRequestContext, withEffectAtomRequest, } from './request.js';
export type { EffectAtomRequestContext } from './request.js';
export { createEffectAtomSerializable, effectAtomSerializable, } from './serialization.js';
export type { EffectAtomSerializableOptions } from './serialization.js';
export { subscribeEffectAtomEvents } from './diagnostics.js';
export type { EffectAtomDiagnostics, EffectAtomEvent } from './diagnostics.js';
