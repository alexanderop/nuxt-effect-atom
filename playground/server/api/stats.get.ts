import { poolStats } from '#shared/notes/repo'
import { stats } from '#shared/notes/store'
import { getEffectAtomDiagnostics } from 'nuxt-effect-atom/testing'

/** Instrumentation for the spike: how often was the layer built, and the db read. */
export default defineEventHandler(() => ({
  poolOpened: poolStats.opened,
  poolClosed: poolStats.closed,
  dbReads: stats.reads,
  effectAtom: getEffectAtomDiagnostics(),
}))
