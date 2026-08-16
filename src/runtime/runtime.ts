import { Atom } from '@effect/atom-vue'
import { Layer } from 'effect'
import { options } from '#effect-atom/options'

/**
 * Drop-in replacement for `Atom.runtime` that is safe under SSR.
 *
 * `Atom.runtime` memoises built layers *per `AtomRegistry`* (see the
 * `eff-523-registry-scoped-atom-runtime` changeset). That is the right default
 * in a SPA, where there is one registry for the life of the tab. On a server
 * where every request gets its own registry it means the layer — connection
 * pool, HTTP client, tracer — is constructed and torn down on every single
 * request.
 *
 * `Atom.context({ memoMap })` with one process-wide `Layer.MemoMap` restores
 * the intended lifetime: registries stay per-request, layers stay per-process.
 */
const serverMemoMap = import.meta.server && options.sharedMemoMap
  ? Layer.makeMemoMapUnsafe()
  : undefined

export const atomRuntime: Atom.RuntimeFactory = serverMemoMap
  ? Atom.context({ memoMap: serverMemoMap })
  : Atom.runtime
