import { AtomRegistry, injectRegistry, useAtomValue } from "@effect/atom-vue";
import { Effect, Option } from "effect";
import { useNuxtApp } from "#app";
import { options } from "#effect-atom/options";
import { recordSuspenseTimeout } from "../diagnostics.js";
import { getEffectAtomRequestContext } from "../request.js";
export class EffectAtomSuspenseTimeoutError extends Error {
  timeout;
  constructor(timeout) {
    super(`[nuxt-effect-atom] SSR atom did not settle within ${timeout}ms.`);
    this.name = "EffectAtomSuspenseTimeoutError";
    this.timeout = timeout;
  }
}
export function useAtomSuspense(atom, suspenseOptions = {}) {
  const nuxtApp = useNuxtApp();
  const resolvedAtom = atom();
  const value = useAtomValue(() => resolvedAtom);
  if (!import.meta.server || !options.ssrSuspense) return Promise.resolve(value);
  const registry = injectRegistry();
  registry.mount(resolvedAtom);
  const settle = () => {
    ;
    value.value = registry.get(resolvedAtom);
    return value;
  };
  const timeout = suspenseOptions.timeout ?? options.ssrSuspenseTimeout;
  const signal = suspenseOptions.signal ?? getEffectAtomRequestContext(registry).signal;
  const waitForResult = Effect.exit(
    AtomRegistry.getResult(registry, resolvedAtom, { suspendOnWaiting: true })
  );
  if (timeout === false) {
    return Effect.runPromise(waitForResult, { signal }).then(settle, settle);
  }
  const wait = Effect.timeoutOption(waitForResult, timeout);
  return Effect.runPromise(wait, { signal }).then(async (result) => {
    if (Option.isSome(result)) return settle();
    recordSuspenseTimeout(timeout);
    await nuxtApp.callHook("effect-atom:suspense:timeout", { timeout });
    if ((suspenseOptions.onTimeout ?? options.ssrSuspenseTimeoutMode) === "throw") {
      throw new EffectAtomSuspenseTimeoutError(timeout);
    }
    return settle();
  }, settle);
}
