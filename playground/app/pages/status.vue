<script setup lang="ts">
import { currentUserAtom } from '~/atoms/notes'

const currentUser = useAtomValue(() => currentUserAtom)
</script>

<template>
  <main>
    <h1>Registry status</h1>
    <p data-testid="status-user">
      current user: {{ currentUser }}
    </p>
    <NuxtLink to="/?author=alice">
      notes
    </NuxtLink>
  </main>
</template>
