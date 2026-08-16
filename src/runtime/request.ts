import { Atom } from '@effect/atom-vue'
import { Context, Layer } from 'effect'
import type { H3Event } from 'h3'
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry'
import type * as Reactivity from 'effect/unstable/reactivity/Reactivity'

export interface EffectAtomRequestContext {
  readonly server: boolean
  readonly url: string
  readonly requestId: string | undefined
  readonly locale: string | undefined
  readonly signal: AbortSignal
  /** Present only during server rendering. Never serialize this value. */
  readonly event: H3Event | undefined
}

export class EffectAtomRequest extends Context.Service<
  EffectAtomRequest,
  EffectAtomRequestContext
>()('@nuxt-effect-atom/Request') {}

const standaloneController = new AbortController()

export const effectAtomRequestAtom = Atom.make<EffectAtomRequestContext>({
  server: false,
  url: 'http://localhost/',
  requestId: undefined,
  locale: undefined,
  signal: standaloneController.signal,
  event: undefined,
}).pipe(Atom.keepAlive)

export const setEffectAtomRequestContext = (
  registry: AtomRegistry.AtomRegistry,
  context: EffectAtomRequestContext,
): void => registry.set(effectAtomRequestAtom, context)

export const getEffectAtomRequestContext = (
  registry: AtomRegistry.AtomRegistry,
): EffectAtomRequestContext => registry.get(effectAtomRequestAtom)

export const effectAtomRequestLayer = (
  context: EffectAtomRequestContext,
): Layer.Layer<EffectAtomRequest> => Layer.succeed(EffectAtomRequest, context)

/** Provide the active Nuxt request to a request-scoped runtime layer. */
export const withEffectAtomRequest = <R, E>(
  layer: Layer.Layer<
    R,
    E,
    EffectAtomRequest | AtomRegistry.AtomRegistry | Reactivity.Reactivity
  >,
) => (get: Atom.AtomContext): Layer.Layer<
  R,
  E,
  AtomRegistry.AtomRegistry | Reactivity.Reactivity
> => Layer.provide(layer, effectAtomRequestLayer(get(effectAtomRequestAtom)))
