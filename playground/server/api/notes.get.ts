import { listRows } from '#shared/notes/store'

export default defineEventHandler(async (event) => {
  const author = String(getQuery(event).author ?? 'alice')
  return await listRows(author)
})
