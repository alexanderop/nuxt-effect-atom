import type { Ref } from 'vue'
import { type Atom, AtomRegistry, injectRegistry, useAtomValue } from '@effect/atom-vue'
import { Effect, Option } from 'effect'
import type * as AsyncResult from 'effect/unstable/reactivity/AsyncResult'
import { useNuxtApp } from '#app'
import { options } from '#effect-atom/options'
import { recordSuspenseTimeout } from '../diagnostics'
import { getEffectAtomRequestContext } from '../request'

export interface UseAtomSuspenseOptions {
  readonly timeout?: number | false
  readonly onTimeout?: 'render-loading' | 'throw'
  readonly signal?: AbortSignal
}

export class EffectAtomSuspenseTimeoutError extends Error {
  readonly timeout: number

  constructor(timeout: number) {
    super(`[nuxt-effect-atom] SSR atom did not settle within ${timeout}ms.`)
    this.name = 'EffectAtomSuspenseTimeoutError'
    this.timeout = timeout
  }
}

/**
 * `useAtomValue` for an async atom that resolves during SSR.
 *
 * The atom factory is intentionally resolved once. This prevents an unstable
 * factory from subscribing to one node while suspense waits on another.
 */
export function useAtomSuspense<A, E>(
  atom: () => Atom.Atom<AsyncResult.AsyncResult<A, E>>,
  suspenseOptions: UseAtomSuspenseOptions = {},
): Promise<Readonly<Ref<AsyncResult.AsyncResult<A, E>>>> {
  const nuxtApp = useNuxtApp()
  const resolvedAtom = atom()
  const value = useAtomValue(() => resolvedAtom)
  if (!import.meta.server || !options.ssrSuspense) return Promise.resolve(value)

  const registry = injectRegistry()
  registry.mount(resolvedAtom)
  const settle = () => {
    ;(value as Ref<AsyncResult.AsyncResult<A, E>>).value = registry.get(resolvedAtom)
    return value
  }

  const timeout = suspenseOptions.timeout ?? options.ssrSuspenseTimeout
  const signal = suspenseOptions.signal ?? getEffectAtomRequestContext(registry).signal
  const waitForResult = Effect.exit(
    AtomRegistry.getResult(registry, resolvedAtom, { suspendOnWaiting: true }),
  )
  if (timeout === false) {
    return Effect.runPromise(waitForResult, { signal }).then(settle, settle)
  }
  const wait = Effect.timeoutOption(waitForResult, timeout)

  return Effect.runPromise(wait, { signal }).then(async (result) => {
    if (Option.isSome(result)) return settle()
    recordSuspenseTimeout(timeout)
    await nuxtApp.callHook('effect-atom:suspense:timeout', { timeout })
    if ((suspenseOptions.onTimeout ?? options.ssrSuspenseTimeoutMode) === 'throw') {
      throw new EffectAtomSuspenseTimeoutError(timeout)
    }
    return settle()
  }, settle)
}
