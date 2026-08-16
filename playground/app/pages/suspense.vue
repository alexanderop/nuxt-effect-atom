<script setup lang="ts">
import { AsyncResult, requestAtomRuntime } from '#effect-atom'
import { Effect, Layer } from 'effect'

const runtime = requestAtomRuntime(Layer.empty)
const created: Array<number> = []
const result = await useAtomSuspense(() => {
  created.push(created.length + 1)
  return runtime.atom(Effect.succeed('settled'))
})
const never = await useAtomSuspense(
  () => runtime.atom(Effect.never),
  { timeout: 20, onTimeout: 'render-loading' },
)
</script>

<template>
  <main>
    <p data-testid="factory-count">
      {{ created.length }}
    </p>
    <p data-testid="settled">
      {{ AsyncResult.isSuccess(result) ? result.value : 'waiting' }}
    </p>
    <p data-testid="timeout">
      {{ AsyncResult.isInitial(never) ? 'loading' : 'unexpected' }}
    </p>
  </main>
</template>
