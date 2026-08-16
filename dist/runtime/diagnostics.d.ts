import type { AtomRegistry } from '@effect/atom-vue';
import * as Hydration from 'effect/unstable/reactivity/Hydration';
export interface EffectAtomDiagnostics {
    registriesCreated: number;
    registriesDisposed: number;
    dehydratedAtoms: number;
    hydratedAtoms: number;
    payloadBytes: number;
    duplicateSerializationKeys: Array<string>;
    hydrationRefreshesSkipped: number;
    hydrationUnsafeReactivityAtoms: number;
    processLayerBuilds: number;
    processLayerDisposals: number;
    dynamicLayerFallbacks: number;
}
interface HydratedValue {
    readonly found: true;
    readonly encoded: unknown;
}
export declare const getEffectAtomDiagnostics: () => Readonly<EffectAtomDiagnostics>;
export declare const resetEffectAtomDiagnostics: () => void;
export declare const exposeEffectAtomDiagnostics: () => void;
export declare const recordRegistryCreated: () => void;
export declare const recordRegistryDisposed: () => void;
export declare const recordProcessLayerBuild: () => void;
export declare const recordProcessLayerDisposal: () => void;
export declare const recordDynamicLayerFallback: () => void;
export declare const recordHydrationRefreshSkipped: () => void;
export declare const recordHydrationUnsafeReactivityAtom: () => void;
export declare const payloadByteLength: (state: ReadonlyArray<Hydration.DehydratedAtom>) => number;
export declare const recordDehydration: (state: ReadonlyArray<Hydration.DehydratedAtom>) => void;
export declare const rememberHydration: (registry: AtomRegistry.AtomRegistry, state: ReadonlyArray<Hydration.DehydratedAtom>) => void;
export declare const takeHydratedValue: (registry: AtomRegistry.AtomRegistry, key: string) => HydratedValue | undefined;
export {};
