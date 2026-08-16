// Every capability can be switched off individually, so the spike can measure
// each one in isolation against the exact same app code. `NAIVE=1` turns the
// whole module off — that is what a Nuxt + Effect Atom app gets today.
const off = (name: string) => process.env.NAIVE === '1' || process.env[name] === '0'

export default defineNuxtConfig({
  modules: ['nuxt-effect-atom'],
  devtools: { enabled: false },
  routeRules: {
    '/route-payload': { prerender: true },
  },
  experimental: { payloadExtraction: true },
  compatibilityDate: 'latest',
  effectAtom: {
    perRequestRegistry: !off('EA_REGISTRY'),
    hydrate: !off('EA_HYDRATE'),
    ssrSuspense: !off('EA_SUSPENSE'),
  },
})
