import type { Ref } from 'vue';
import { type Atom } from '@effect/atom-vue';
import type * as AsyncResult from 'effect/unstable/reactivity/AsyncResult';
export interface UseAtomSuspenseOptions {
    readonly timeout?: number | false;
    readonly onTimeout?: 'render-loading' | 'throw';
    readonly signal?: AbortSignal;
}
export declare class EffectAtomSuspenseTimeoutError extends Error {
    readonly timeout: number;
    constructor(timeout: number);
}
/**
 * `useAtomValue` for an async atom that resolves during SSR.
 *
 * The atom factory is intentionally resolved once. This prevents an unstable
 * factory from subscribing to one node while suspense waits on another.
 */
export declare function useAtomSuspense<A, E>(atom: () => Atom.Atom<AsyncResult.AsyncResult<A, E>>, suspenseOptions?: UseAtomSuspenseOptions): Promise<Readonly<Ref<AsyncResult.AsyncResult<A, E>>>>;
