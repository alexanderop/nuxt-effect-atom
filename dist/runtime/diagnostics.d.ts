import type { AtomRegistry } from '@effect/atom-vue';
import * as Hydration from 'effect/unstable/reactivity/Hydration';
export interface EffectAtomDiagnostics {
    registriesCreated: number;
    registriesDisposed: number;
    dehydratedAtoms: number;
    hydratedAtoms: number;
    payloadBytes: number;
    currentPayloadBytes: number;
    largestPayloadBytes: number;
    currentPayloadAtomBytes: Readonly<Record<string, number>>;
    payloadWarnings: number;
    payloadRejections: number;
    duplicateSerializationKeys: Array<string>;
    serializationKeyConflicts: Array<string>;
    hydrationRefreshesSkipped: number;
    freshHydrations: number;
    staleHydrations: number;
    routeHydrations: number;
    hydrationUnsafeReactivityAtoms: number;
    suspenseTimeouts: number;
    processLayerBuilds: number;
    processLayerDisposals: number;
    dynamicLayerFallbacks: number;
}
export type EffectAtomEvent = {
    readonly type: 'registry:created' | 'registry:disposed';
} | {
    readonly type: 'layer:acquired' | 'layer:disposed';
} | {
    readonly type: 'hydrated';
    readonly atoms: number;
    readonly route: boolean;
} | {
    readonly type: 'dehydrated';
    readonly atoms: number;
    readonly bytes: number;
} | {
    readonly type: 'payload:warning' | 'payload:rejected';
    readonly bytes: number;
    readonly limit: number;
} | {
    readonly type: 'suspense:timeout';
    readonly timeout: number;
};
export interface PayloadDiagnostics {
    readonly bytes: number;
    readonly atomBytes: Readonly<Record<string, number>>;
}
interface HydratedValue {
    readonly found: true;
    readonly encoded: unknown;
    readonly dehydratedAt: number;
}
export declare const subscribeEffectAtomEvents: (listener: (event: EffectAtomEvent) => void) => (() => void);
export declare const getEffectAtomDiagnostics: () => Readonly<EffectAtomDiagnostics>;
export declare const resetEffectAtomDiagnostics: () => void;
export declare const exposeEffectAtomDiagnostics: () => void;
export declare const recordRegistryCreated: () => void;
export declare const recordRegistryDisposed: () => void;
export declare const recordProcessLayerBuild: () => void;
export declare const recordProcessLayerDisposal: () => void;
export declare const recordDynamicLayerFallback: () => void;
export declare const recordHydrationRefreshSkipped: () => void;
export declare const recordFreshHydration: () => void;
export declare const recordStaleHydration: () => void;
export declare const recordHydrationUnsafeReactivityAtom: () => void;
export declare const payloadByteLength: (state: ReadonlyArray<Hydration.DehydratedAtom>) => number;
export declare const recordDehydration: (state: ReadonlyArray<Hydration.DehydratedAtom>) => PayloadDiagnostics;
export declare const rememberHydration: (registry: AtomRegistry.AtomRegistry, state: ReadonlyArray<Hydration.DehydratedAtom>, options?: {
    readonly route?: boolean;
}) => void;
export declare const takeHydratedValue: (registry: AtomRegistry.AtomRegistry, key: string) => HydratedValue | undefined;
export declare const queueStaleHydrationRefresh: (registry: AtomRegistry.AtomRegistry, refresh: () => void) => void;
export declare const flushStaleHydrationRefreshes: (registry: AtomRegistry.AtomRegistry) => void;
export declare const recordSerializationKeyConflict: (key: string) => void;
export declare const recordPayloadWarning: (bytes: number, limit: number) => void;
export declare const recordPayloadRejection: (bytes: number, limit: number) => void;
export declare const recordSuspenseTimeout: (timeout: number) => void;
export {};
