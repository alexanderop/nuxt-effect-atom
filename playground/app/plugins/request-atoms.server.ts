import { getQuery } from 'h3'
import { setRequestAtom } from '#effect-atom'
import { currentUserAtom } from '~/atoms/notes'

export default defineNuxtPlugin({
  name: 'playground-request-atoms',
  hooks: {
    'effect-atom:setup': ({ registry, ssrContext }) => {
      if (ssrContext === undefined) return
      const author = String(getQuery(ssrContext.event).author ?? 'alice')
      setRequestAtom(registry, currentUserAtom, author)
    },
  },
})
