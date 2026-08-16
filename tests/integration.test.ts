import { fileURLToPath } from 'node:url'
import { createPage, fetch, setup } from '@nuxt/test-utils/e2e'
import { expect as playwrightExpect } from '@playwright/test'
import { describe, expect, it } from 'vitest'

await setup({
  rootDir: fileURLToPath(new URL('../playground', import.meta.url)),
  browser: true,
  setupTimeout: 180_000,
})

describe('Nuxt integration', () => {
  it('isolates concurrent request registries and shares process layers', async () => {
    const authors = Array.from({ length: 10 }, (_, index) => index % 2 === 0 ? 'alice' : 'bob')
    const responses = await Promise.all(authors.map(author => fetch(`/?author=${author}`)))
    const html = await Promise.all(responses.map(response => response.text()))

    html.forEach((document, index) => {
      expect(document).toContain(`registry says the current user is: ${authors[index]}`)
      expect(document).toContain(`Notes for ${authors[index]}`)
    })

    const stats = await (await fetch('/api/stats')).json()
    expect(stats.poolOpened).toBe(1)
    expect(stats.poolClosed).toBe(0)
    expect(stats.effectAtom.processLayerBuilds).toBe(1)
    expect(stats.effectAtom.registriesCreated).toBe(stats.effectAtom.registriesDisposed)
  })

  it('hydrates without refetching and survives client navigation', async () => {
    const page = await createPage('/?author=alice')

    await playwrightExpect(page.getByTestId('client-lists')).toHaveText('client fetches since mount: 0')
    await playwrightExpect(page.getByTestId('rendered-user')).toContainText('alice')
    const diagnostics = await page.evaluate(() => Reflect.get(window, '__effectAtomDiagnostics')) as {
      readonly hydratedAtoms: number
      readonly hydrationRefreshesSkipped: number
    }
    expect(diagnostics.hydratedAtoms).toBeGreaterThanOrEqual(2)
    expect(diagnostics.hydrationRefreshesSkipped).toBe(1)

    await page.getByRole('link', { name: 'status' }).click()
    await page.waitForURL('**/status')
    await playwrightExpect(page.getByRole('heading', { name: 'Registry status' })).toBeVisible()
    await playwrightExpect(page.getByTestId('status-user')).toContainText('alice')

    await page.close()
  }, 15_000)

  it('resolves one suspense atom and bounds a never-settling atom', async () => {
    const page = await createPage('/suspense')
    await playwrightExpect(page.getByTestId('factory-count')).toHaveText('1')
    await playwrightExpect(page.getByTestId('settled')).toHaveText('settled')
    await playwrightExpect(page.getByTestId('timeout')).toHaveText('loading')
    await page.close()
  })

  it('hydrates extracted route payloads before client page setup', async () => {
    const page = await createPage('/?author=alice')
    await page.getByRole('link', { name: 'route payload' }).click()
    await page.waitForURL('**/route-payload')
    await playwrightExpect(page.getByTestId('route-payload-value')).toHaveText('from extracted payload')
    await playwrightExpect(page.getByTestId('route-payload-client-reads')).toHaveText('0')
    await page.close()
  })
})
