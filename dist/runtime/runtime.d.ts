/** Safe default for application, request, session, and browser-owned services. */
export declare const requestAtomRuntime: import("effect/unstable/reactivity/Atom").RuntimeFactory;
/** Explicit process owner for fully provided pools, tracers, and infrastructure. */
export declare const processAtomRuntime: import("./public.js").ProcessAtomRuntimeFactory;
/**
 * @deprecated Lifetime inference is ambiguous. Migrate to `requestAtomRuntime`
 * or `processAtomRuntime`.
 */
export declare const atomRuntime: import("effect/unstable/reactivity/Atom").RuntimeFactory;
export declare const effectAtomSerializable: <R extends import("effect/unstable/reactivity/Atom").Atom<unknown>, S extends import("effect/Schema").ConstraintCodec<import("effect/unstable/reactivity/Atom").Type<R>, unknown>>(options: import("./serialization.js").EffectAtomSerializableOptions<S>) => (source: R) => R & import("effect/unstable/reactivity/Atom").Serializable<S> & import("./serialization.js").HydrationPolicyAtom<R>;
