import type { Plugin } from 'vue';
import { AtomRegistry } from '@effect/atom-vue';
import type { Atom } from '@effect/atom-vue';
import * as Hydration from 'effect/unstable/reactivity/Hydration';
import type { RegistryOptions } from '../module.js';
import { type EffectAtomRequestContext } from './request.js';
export interface AtomTestHarness {
    readonly registry: AtomRegistry.AtomRegistry;
    readonly get: <A>(atom: Atom.Atom<A>) => A;
    readonly set: <R, W>(atom: Atom.Writable<R, W>, value: W) => void;
    readonly mount: <A>(atom: Atom.Atom<A>) => () => void;
    readonly dehydrate: () => ReadonlyArray<Hydration.DehydratedAtom>;
    readonly hydrate: (state: ReadonlyArray<Hydration.DehydratedAtom>) => number;
    readonly dispose: () => void;
    readonly [Symbol.dispose]: () => void;
}
export interface AtomTestHarnessOptions extends RegistryOptions {
    readonly initialValues?: Iterable<readonly [Atom.Atom<unknown>, unknown]>;
    readonly request?: EffectAtomRequestContext;
}
export declare const createAtomTestHarness: (options?: AtomTestHarnessOptions) => AtomTestHarness;
export declare const createHydratedAtomTestHarness: (state: ReadonlyArray<Hydration.DehydratedAtom>, options?: AtomTestHarnessOptions) => AtomTestHarness;
export declare const withAtomTestHarness: <A>(run: (harness: AtomTestHarness) => A | Promise<A>, options?: AtomTestHarnessOptions) => Promise<A>;
export declare const atomRegistryPlugin: (registry: AtomRegistry.AtomRegistry) => Plugin;
