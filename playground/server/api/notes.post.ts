import { insertRow } from '#shared/notes/store'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ author: string, text: string }>(event)
  return await insertRow(body.author, body.text)
})
