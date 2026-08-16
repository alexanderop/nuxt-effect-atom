import { defineEventHandler } from 'h3'
import { getEffectAtomDiagnostics } from '../diagnostics'

export default defineEventHandler(() => getEffectAtomDiagnostics())
