import { Context, Effect, Layer, Schema } from 'effect'
import type { Note } from './domain'
import { insertRow, listRows } from './store'

/**
 * `Schema.TaggedError` rather than `Data.TaggedError`: the failure channel of
 * a serializable atom has to be encodable, and the schema has to decode back
 * into the same class the `AsyncResult` is typed with.
 */
// eslint-disable-next-line unicorn/throw-new-error -- this is a class factory, not a throw
export class NotesError extends Schema.TaggedError<NotesError>()('NotesError', {
  message: Schema.String,
}) {}

export class NotesRepo extends Context.Service<NotesRepo, {
  readonly list: (author: string) => Effect.Effect<ReadonlyArray<Note>, NotesError>
  readonly add: (input: { author: string, text: string }) => Effect.Effect<Note, NotesError>
}>()('NotesRepo') {}

/**
 * Stands in for the expensive part of a real layer — a connection pool, an
 * HTTP client, a tracer. It is deliberately noisy: how many times this logs
 * across N requests is the whole measurement for layer lifetime.
 */
export const poolStats = ((globalThis as typeof globalThis & {
  __notesPoolStats?: { opened: number, closed: number }
}).__notesPoolStats ??= { opened: 0, closed: 0 })

const acquirePool = Effect.acquireRelease(
  Effect.sync(() => {
    poolStats.opened++
    console.log(`[NotesRepo] pool OPENED (opened=${poolStats.opened})`)
    return { id: poolStats.opened }
  }),
  pool =>
    Effect.sync(() => {
      poolStats.closed++
      console.log(`[NotesRepo] pool closed #${pool.id}`)
    }),
)

/** Server: talks to the "database" directly. */
export const NotesRepoServer = Layer.effect(
  NotesRepo,
  Effect.gen(function* () {
    yield* acquirePool
    return {
      list: (author: string) =>
        Effect.tryPromise({
          try: () => listRows(author),
          catch: cause => new NotesError({ message: String(cause) }),
        }),
      add: ({ author, text }: { author: string, text: string }) =>
        Effect.tryPromise({
          try: () => insertRow(author, text),
          catch: cause => new NotesError({ message: String(cause) }),
        }),
    }
  }),
)

/** Counts browser-side loads, so a test can prove hydration avoided a refetch. */
export const clientStats = ((globalThis as typeof globalThis & {
  __notesClientStats?: { lists: number }
}).__notesClientStats ??= { lists: 0 })

/** Client: same interface over the Nitro route. */
export const NotesRepoClient = Layer.sync(NotesRepo, () => ({
  list: (author: string) =>
    Effect.tryPromise({
      try: () => {
        clientStats.lists++
        return $fetch<ReadonlyArray<Note>>('/api/notes', { query: { author } })
      },
      catch: cause => new NotesError({ message: String(cause) }),
    }),
  add: ({ author, text }: { author: string, text: string }) =>
    Effect.tryPromise({
      try: () => $fetch<Note>('/api/notes', { method: 'POST', body: { author, text } }),
      catch: cause => new NotesError({ message: String(cause) }),
    }),
}))

export const NotesRepoLive = import.meta.server ? NotesRepoServer : NotesRepoClient
