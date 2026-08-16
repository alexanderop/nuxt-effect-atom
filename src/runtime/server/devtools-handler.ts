import { defineEventHandler, setHeader } from 'h3'

const document = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Effect Atom diagnostics</title>
  <style>
    :root { color-scheme: light dark; font: 14px/1.45 ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; padding: 20px; background: Canvas; color: CanvasText; }
    h1 { margin: 0 0 6px; font-size: 20px; }
    p { margin: 0 0 18px; color: color-mix(in srgb, CanvasText 68%, transparent); }
    dl { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(90px, auto); gap: 1px; overflow: hidden; border: 1px solid color-mix(in srgb, CanvasText 15%, transparent); border-radius: 10px; }
    dt, dd { margin: 0; padding: 10px 12px; background: color-mix(in srgb, CanvasText 5%, Canvas); }
    dd { text-align: right; font-variant-numeric: tabular-nums; }
    .warning { color: #d97706; }
  </style>
</head>
<body>
  <h1>Effect Atom</h1>
  <p>Lifecycle and payload metadata only. Atom values are never exposed.</p>
  <dl id="metrics" aria-live="polite"><dt>Status</dt><dd>Loading…</dd></dl>
  <script>
    const labels = {
      registriesCreated: 'Registries created', registriesDisposed: 'Registries disposed',
      dehydratedAtoms: 'Atoms dehydrated', hydratedAtoms: 'Atoms hydrated',
      currentPayloadBytes: 'Current payload bytes', largestPayloadBytes: 'Largest payload bytes',
      freshHydrations: 'Fresh hydrations', staleHydrations: 'Stale hydrations',
      routeHydrations: 'Route hydrations', hydrationRefreshesSkipped: 'Refetches skipped',
      suspenseTimeouts: 'Suspense timeouts', processLayerBuilds: 'Process layer builds',
      processLayerDisposals: 'Process layer disposals', payloadWarnings: 'Payload warnings',
      payloadRejections: 'Payload rejections', serializationKeyConflicts: 'Serialization key conflicts'
    }
    const metrics = document.querySelector('#metrics')
    const render = (data) => {
      metrics.replaceChildren()
      for (const [key, label] of Object.entries(labels)) {
        const dt = document.createElement('dt'); dt.textContent = label
        const dd = document.createElement('dd')
        const value = data[key]
        dd.textContent = Array.isArray(value) ? (value.join(', ') || 'none') : String(value ?? 0)
        if ((key.includes('Warning') || key.includes('Rejection') || key.includes('Conflict')) && Number(value?.length ?? value) > 0) dd.className = 'warning'
        metrics.append(dt, dd)
      }
    }
    const refresh = async () => {
      try { render(await fetch('/__effect-atom/diagnostics').then(response => response.json())) }
      catch { metrics.textContent = 'Diagnostics unavailable' }
    }
    refresh(); setInterval(refresh, 1000)
  </script>
</body>
</html>`

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'text/html; charset=utf-8')
  return document
})
