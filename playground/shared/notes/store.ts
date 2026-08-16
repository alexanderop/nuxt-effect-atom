import type { Note } from './domain'

/**
 * Stand-in for a database. Lives in `shared/` so the Nitro route and the
 * server-side `NotesRepo` layer read the same rows.
 *
 * Per-author data is what makes the cross-request isolation check meaningful:
 * if two concurrent renders share a registry, one author sees the other's
 * notes.
 */
/**
 * Nuxt builds the Vue SSR bundle (Vite) and the Nitro bundle (rollup) as two
 * module graphs, so a plain module-level `Map` here would exist twice — the
 * server-rendered page and `/api/notes` would read different databases.
 * Hanging the state off `globalThis` gives both graphs the same rows.
 */
const globals = globalThis as typeof globalThis & {
  __notesRows?: Map<string, Array<Note>>
  __notesStats?: { reads: number }
}

const rows = (globals.__notesRows ??= new Map<string, Array<Note>>([
  ['alice', [
    { id: 'a1', author: 'alice', text: 'Ship the SSR spike', createdAt: 3 },
    { id: 'a2', author: 'alice', text: 'Alice keeps a shopping list', createdAt: 1 },
  ]],
  ['bob', [
    { id: 'b1', author: 'bob', text: 'Bob is not Alice', createdAt: 2 },
  ]],
]))

/** Bumped on every read, so a test can prove the browser did not refetch. */
export const stats = (globals.__notesStats ??= { reads: 0 })

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export async function listRows(author: string): Promise<ReadonlyArray<Note>> {
  await sleep(120)
  stats.reads++
  return rows.get(author) ?? []
}

export async function insertRow(author: string, text: string): Promise<Note> {
  await sleep(80)
  const note: Note = {
    id: `${author}-${Math.random().toString(36).slice(2, 8)}`,
    author,
    text,
    createdAt: Date.now(),
  }
  rows.set(author, [...(rows.get(author) ?? []), note])
  return note
}
