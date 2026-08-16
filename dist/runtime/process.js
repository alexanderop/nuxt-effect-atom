import { Effect, Exit, Layer, Scope } from "effect";
import {
  recordProcessLayerBuild,
  recordProcessLayerDisposal
} from "./diagnostics.js";
const globals = globalThis;
const makeState = () => ({
  scope: Scope.makeUnsafe(),
  memoMap: Layer.makeMemoMapUnsafe(),
  builtLayers: /* @__PURE__ */ new WeakSet()
});
const states = () => globals.__nuxtEffectAtomProcessLayers ??= /* @__PURE__ */ new Map();
const state = (runtimeKey) => {
  const current = states().get(runtimeKey);
  if (current !== void 0 && current.disposePromise === void 0) return current;
  const created = makeState();
  states().set(runtimeKey, created);
  return created;
};
export const processSharedLayer = (layer, runtimeKey = "standalone") => {
  const current = state(runtimeKey);
  const build = Layer.buildWithMemoMap(layer, current.memoMap, current.scope).pipe(
    Effect.tap(() => Effect.sync(() => {
      if (current.builtLayers.has(layer)) return;
      current.builtLayers.add(layer);
      recordProcessLayerBuild();
    }))
  );
  const cachedBuild = Effect.runSync(Effect.cached(build));
  return Layer.effectContext(cachedBuild);
};
const disposeState = (runtimeKey, current) => {
  if (current.disposePromise !== void 0) return current.disposePromise;
  current.disposePromise = Effect.runPromise(Scope.close(current.scope, Exit.void)).then(() => {
    recordProcessLayerDisposal();
    if (globals.__nuxtEffectAtomProcessLayers?.get(runtimeKey) === current) {
      globals.__nuxtEffectAtomProcessLayers.delete(runtimeKey);
    }
  });
  return current.disposePromise;
};
export const disposeServerRuntime = (runtimeKey) => {
  const currentStates = globals.__nuxtEffectAtomProcessLayers;
  if (currentStates === void 0) return Promise.resolve();
  if (runtimeKey !== void 0) {
    const current = currentStates.get(runtimeKey);
    return current === void 0 ? Promise.resolve() : disposeState(runtimeKey, current);
  }
  return Promise.all(
    Array.from(currentStates, ([key, current]) => disposeState(key, current))
  ).then(() => void 0);
};
