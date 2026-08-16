import type { Ref } from 'vue';
import { type Atom } from '@effect/atom-vue';
import type * as AsyncResult from 'effect/unstable/reactivity/AsyncResult';
/**
 * `useAtomValue` for an async atom, but it resolves during SSR.
 *
 * Two separate things are broken about reading an async atom on the server,
 * and this fixes both:
 *
 * 1. Nobody awaits it. `useAtomValue` only subscribes, so the atom is still
 *    `AsyncResult.Initial` when the HTML is generated and the response ships a
 *    loading state. This awaits it the way `useAsyncData` awaits a fetch.
 *
 * 2. The subscription is dead on arrival. `useAtomValue` subscribes inside a
 *    default-flush `watchEffect`, and Vue's SSR path stops such watchers
 *    immediately after creating them (`runsImmediately` in `doWatch` — only
 *    `flush: 'sync'` watchers get deferred cleanup via `__watcherHandles`).
 *    Stopping runs the cleanup, which unsubscribes from the registry. So the
 *    ref receives exactly one synchronous read and never updates again — even
 *    if you await the atom yourself. The settled value has to be written back
 *    into the ref by hand.
 *
 * Failures are not thrown: they stay in the `AsyncResult` so the component can
 * render an error branch instead of failing the whole page.
 *
 * ```vue
 * <script setup lang="ts">
 * const notes = await useAtomSuspense(() => notesAtom('alice'))
 * </script>
 * ```
 */
export declare function useAtomSuspense<A, E>(atom: () => Atom.Atom<AsyncResult.AsyncResult<A, E>>): Promise<Readonly<Ref<AsyncResult.AsyncResult<A, E>>>>;
