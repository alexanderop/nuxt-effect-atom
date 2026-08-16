import { Schema } from 'effect'

export const Note = Schema.Struct({
  id: Schema.String,
  author: Schema.String,
  text: Schema.String,
  createdAt: Schema.Number,
})

export type Note = typeof Note.Type

export const Notes = Schema.Array(Note)

export const sortNotes = (notes: ReadonlyArray<Note>): ReadonlyArray<Note> =>
  [...notes].sort((a, b) => b.createdAt - a.createdAt)
