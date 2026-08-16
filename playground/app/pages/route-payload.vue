<script setup lang="ts">
import { AsyncResult } from '#effect-atom'
import { routePayloadAtom, routePayloadStats } from '~/atoms/notes'

const result = await useAtomSuspense(() => routePayloadAtom)
const clientReads = ref(-1)

onMounted(() => {
  clientReads.value = routePayloadStats.clientReads
})
</script>

<template>
  <main>
    <h1>Route payload</h1>
    <p data-testid="route-payload-value">
      {{ AsyncResult.isSuccess(result) ? result.value : 'loading' }}
    </p>
    <p data-testid="route-payload-client-reads">
      {{ clientReads }}
    </p>
  </main>
</template>
