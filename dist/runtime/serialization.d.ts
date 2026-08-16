import { Atom } from '@effect/atom-vue';
import type { Schema } from 'effect';
export declare const HydrationPolicyTypeId: "~nuxt-effect-atom/HydrationPolicy";
export interface HydrationPolicy {
    readonly staleTime: number | false;
}
export interface EffectAtomSerializableOptions<S extends Schema.Constraint> {
    readonly key: string;
    readonly schema: S;
    /** Override the module-wide hydration freshness policy for this atom. */
    readonly staleTime?: number | false;
}
export type HydrationPolicyAtom<A extends Atom.Atom<unknown>> = A & {
    readonly [HydrationPolicyTypeId]?: HydrationPolicy;
};
export declare const createEffectAtomSerializable: (duplicateKeyPolicy?: "warn" | "error") => <R extends Atom.Atom<unknown>, S extends Schema.ConstraintCodec<Atom.Type<R>, unknown>>(options: EffectAtomSerializableOptions<S>) => (source: R) => R & Atom.Serializable<S> & HydrationPolicyAtom<R>;
/** Standalone default. Nuxt's `#effect-atom` export applies the configured policy. */
export declare const effectAtomSerializable: <R extends Atom.Atom<unknown>, S extends Schema.ConstraintCodec<Atom.Type<R>, unknown>>(options: EffectAtomSerializableOptions<S>) => (source: R) => R & Atom.Serializable<S> & HydrationPolicyAtom<R>;
export declare const hydrationPolicy: (atom: Atom.Atom<unknown>) => HydrationPolicy | undefined;
