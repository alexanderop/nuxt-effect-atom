/**
 * Runs the playground under several module configurations and reports what
 * each capability actually buys. Every scenario runs the *same* app code —
 * only the module's behaviour changes.
 *
 *   node scripts/measure.mjs
 */
import { spawn } from 'node:child_process'
import process from 'node:process'

const PORT = 3123
const BASE = `http://localhost:${PORT}`

const scenarios = [
  { name: 'module off (NAIVE)', env: { NAIVE: '1' } },
  { name: 'module on', env: {} },
  { name: 'no per-request registry', env: { EA_REGISTRY: '0' } },
  { name: 'no SSR suspense', env: { EA_SUSPENSE: '0' } },
  { name: 'no shared MemoMap', env: { EA_MEMOMAP: '0' } },
]

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function waitForServer(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/stats`)
      if (res.ok) return
    }
    catch {}
    await sleep(500)
  }
  throw new Error('server did not start')
}

const text = url => fetch(url).then(r => r.text())
const json = url => fetch(url).then(r => r.json())

/** The payload block, so page markup and serialised state can be told apart. */
const splitPayload = (html) => {
  const marker = '__NUXT_DATA__'
  const at = html.indexOf(marker)
  return at === -1 ? [html, ''] : [html.slice(0, at), html.slice(at)]
}

async function measure() {
  const results = {}

  // 1 + 3: is the data in the markup, and is it in the payload?
  const alice = await text(`${BASE}/?author=alice`)
  const [markup, payload] = splitPayload(alice)
  results.ssrRendersData = markup.includes('Alice keeps a shopping list')
  results.ssrRendersLoading = markup.includes('loading…')
  results.payloadHasAtom = payload.includes('notes:alice')

  // 2: do concurrent renders for different users stay isolated? Each page
  // writes its user into a request-scoped atom and reads it back after the
  // await; a shared registry means the other request has overwritten it.
  const pairs = await Promise.all(
    Array.from({ length: 10 }, (_, i) => {
      const author = i % 2 ? 'bob' : 'alice'
      return text(`${BASE}/?author=${author}`).then(html => ({
        author,
        markup: splitPayload(html)[0],
      }))
    }),
  )
  results.wrongUserRendered = pairs.filter(p =>
    !p.markup.includes(`current user is: ${p.author}`),
  ).length

  // 4: how many times is the layer built across 20 concurrent renders?
  const before = await json(`${BASE}/api/stats`)
  await Promise.all(
    Array.from({ length: 20 }, () => text(`${BASE}/?author=alice`)),
  )
  const after = await json(`${BASE}/api/stats`)
  results.poolOpensPer20Requests = after.poolOpened - before.poolOpened
  results.dbReadsPer20Requests = after.dbReads - before.dbReads

  return results
}

const rows = []
for (const scenario of scenarios) {
  const child = spawn('npx', ['nuxt', 'dev', 'playground', '--port', String(PORT)], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, ...scenario.env, NUXT_IGNORE_LOCK: '1' },
    stdio: 'ignore',
  })
  try {
    await waitForServer()
    const result = await measure()
    rows.push({ scenario: scenario.name, ...result })
    console.log(`✔ ${scenario.name}`, result)
  }
  catch (error) {
    rows.push({ scenario: scenario.name, error: String(error) })
    console.log(`✖ ${scenario.name}`, error)
  }
  finally {
    child.kill('SIGTERM')
    await sleep(1500)
  }
}

console.log('\n=== summary ===')
console.table(rows)
