import { AsyncResult, Atom, atomRuntime } from '#effect-atom'
import { Effect } from 'effect'
import { Notes, sortNotes } from '#shared/notes/domain'
import { NotesError, NotesRepo, NotesRepoLive } from '#shared/notes/repo'

/**
 * `atomRuntime` instead of `Atom.runtime`: on the server this factory is backed
 * by one process-wide `Layer.MemoMap`, so `NotesRepoServer` — and the pool it
 * acquires — is built once for the process instead of once per request.
 */
export const runtime = atomRuntime(NotesRepoLive)

/**
 * Who this request is for. Every real app has an atom like this — session,
 * locale, feature flags — written once from the incoming request rather than
 * keyed by a value that is already in the atom's identity.
 *
 * It is the atom that exposes a shared registry: with no per-request provide,
 * concurrent renders write to the same node and the last writer wins.
 */
export const currentUserAtom = Atom.make('anonymous').pipe(Atom.keepAlive)

const notesResult = AsyncResult.Schema({
  success: Notes,
  error: NotesError,
})

/**
 * One atom per author. `Atom.serializable` is what opts it into the SSR
 * payload: without it `Hydration.dehydrate` skips the atom and the client
 * refetches everything the server just rendered.
 */
export const notesAtom = Atom.family((author: string) =>
  runtime
    .atom(
      Effect.gen(function* () {
        const repo = yield* NotesRepo
        return sortNotes(yield* repo.list(author))
      }),
    )
    .pipe(
      // NOTE: `atomRuntime.withReactivity(['notes'])` belongs here and is what
      // you would write in a SPA — but it defeats hydration. The reactivity
      // subscription invalidates the atom as soon as it is mounted on the
      // client, which discards the value the server just sent and refetches.
      // Measured: with it, 1 request to /api/notes on load; without it, 0.
      // Until that is resolved, invalidate explicitly (see `submit` in
      // pages/index.vue).
      Atom.serializable({ key: `notes:${author}`, schema: notesResult }),
    ),
)

export const addNoteAtom = runtime.fn(
  (input: { author: string, text: string }) =>
    Effect.gen(function* () {
      const repo = yield* NotesRepo
      return yield* repo.add(input)
    }),
)
