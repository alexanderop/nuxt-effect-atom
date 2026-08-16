import { Atom } from "@effect/atom-vue";
import { Context, Layer } from "effect";
export class EffectAtomRequest extends Context.Service()("@nuxt-effect-atom/Request") {
}
const standaloneController = new AbortController();
export const effectAtomRequestAtom = Atom.make({
  server: false,
  url: "http://localhost/",
  requestId: void 0,
  locale: void 0,
  signal: standaloneController.signal,
  event: void 0
}).pipe(Atom.keepAlive);
export const setEffectAtomRequestContext = (registry, context) => registry.set(effectAtomRequestAtom, context);
export const getEffectAtomRequestContext = (registry) => registry.get(effectAtomRequestAtom);
export const effectAtomRequestLayer = (context) => Layer.succeed(EffectAtomRequest, context);
export const withEffectAtomRequest = (layer) => (get) => Layer.provide(layer, effectAtomRequestLayer(get(effectAtomRequestAtom)));
