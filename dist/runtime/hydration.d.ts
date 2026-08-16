import * as Hydration from 'effect/unstable/reactivity/Hydration';
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
export declare const EFFECT_ATOM_PAYLOAD_KEY = "nuxt-effect-atom";
export declare const registerHydrationSafeKey: (key: string) => void;
export declare const isDehydratedState: (value: unknown) => value is ReadonlyArray<Hydration.DehydratedAtom>;
export declare const hydrateRegistry: (registry: AtomRegistry.AtomRegistry, state: ReadonlyArray<Hydration.DehydratedAtom>, options?: {
    readonly missingOnly?: boolean;
    readonly route?: boolean;
}) => number;
