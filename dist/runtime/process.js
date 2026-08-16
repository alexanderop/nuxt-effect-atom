import { Effect, Exit, Layer, Scope } from "effect";
import {
  recordProcessLayerBuild,
  recordProcessLayerDisposal
} from "./diagnostics.js";
const globals = globalThis;
const makeState = () => ({
  scope: Scope.makeUnsafe(),
  memoMap: Layer.makeMemoMapUnsafe()
});
const state = () => globals.__nuxtEffectAtomProcessLayers ??= makeState();
export const processSharedLayer = (layer) => {
  const current = state();
  const build = Layer.buildWithMemoMap(layer, current.memoMap, current.scope).pipe(
    Effect.tap(() => Effect.sync(recordProcessLayerBuild))
  );
  const cachedBuild = Effect.runSync(Effect.cached(build));
  return Layer.effectContext(cachedBuild);
};
export const disposeServerRuntime = () => {
  const current = globals.__nuxtEffectAtomProcessLayers;
  if (current === void 0) return Promise.resolve();
  if (current.disposePromise !== void 0) return current.disposePromise;
  current.disposePromise = Effect.runPromise(Scope.close(current.scope, Exit.void)).then(() => {
    recordProcessLayerDisposal();
    if (globals.__nuxtEffectAtomProcessLayers === current) {
      globals.__nuxtEffectAtomProcessLayers = void 0;
    }
  });
  return current.disposePromise;
};
