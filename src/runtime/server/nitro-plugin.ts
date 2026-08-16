import { defineNitroPlugin } from 'nitropack/runtime'
import { disposeServerRuntime } from '../process'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('close', disposeServerRuntime)
})
