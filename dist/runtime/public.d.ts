import { Atom } from '@effect/atom-vue';
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
export interface AtomRuntimeOptions {
    readonly sharedMemoMap?: boolean;
    readonly hydrationSafeReactivity?: boolean;
    /** Override Nuxt's platform detection in plain runtimes such as Vitest. */
    readonly server?: boolean;
}
/** Set one request-derived atom before SSR reads begin. */
export declare const setRequestAtom: <R, W>(registry: AtomRegistry.AtomRegistry, atom: Atom.Writable<R, W>, value: W) => void;
export declare const createAtomRuntime: (options?: AtomRuntimeOptions) => Atom.RuntimeFactory;
/**
 * Standalone defaults for non-Nuxt consumers and tests. Nuxt's `#effect-atom`
 * alias configures the same factory from module options.
 */
export declare const atomRuntime: Atom.RuntimeFactory;
