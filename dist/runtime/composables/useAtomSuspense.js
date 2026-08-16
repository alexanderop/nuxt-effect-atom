import { AtomRegistry, injectRegistry, useAtomValue } from "@effect/atom-vue";
import { Effect } from "effect";
import { options } from "#effect-atom/options";
export function useAtomSuspense(atom) {
  const value = useAtomValue(atom);
  if (!import.meta.server || !options.ssrSuspense) return Promise.resolve(value);
  const registry = injectRegistry();
  registry.mount(atom());
  const settle = () => {
    ;
    value.value = registry.get(atom());
    return value;
  };
  return Effect.runPromise(
    AtomRegistry.getResult(registry, atom(), { suspendOnWaiting: true })
  ).then(settle, settle);
}
