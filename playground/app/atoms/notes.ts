import { AsyncResult, Atom, atomRuntime } from '#effect-atom'
import { Effect, Schema } from 'effect'
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
export const currentUserAtom = Atom.make('anonymous').pipe(
  Atom.keepAlive,
  Atom.serializable({ key: 'current-user', schema: Schema.String }),
)

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
      Atom.serializable({ key: `notes:${author}`, schema: notesResult }),
      // Keep serializable before withReactivity so the module can recognize a
      // hydrated value and defer the source subscription until invalidation.
      atomRuntime.withReactivity(['notes']),
    ),
)

export const addNoteAtom = runtime.fn(
  (input: { author: string, text: string }) =>
    Effect.gen(function* () {
      const repo = yield* NotesRepo
      return yield* repo.add(input)
    }),
  { reactivityKeys: ['notes'] },
)
