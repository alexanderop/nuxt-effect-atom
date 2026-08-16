<script setup lang="ts">
import { AsyncResult } from '#effect-atom'
import { addNoteAtom, currentUserAtom, notesAtom } from '~/atoms/notes'
import { clientStats } from '#shared/notes/repo'

const route = useRoute()
const author = String(route.query.author ?? 'alice')

const registry = useAtomRegistry()

// The one line the module exists for. `useAtomValue` here would render the
// loading branch on the server; this awaits the atom before the HTML is built.
const notes = await useAtomSuspense(() => notesAtom(author))

// Read back after the await: if this render shared a registry with a
// concurrent one, the other request has overwritten it by now.
const renderedUser = ref(registry.get(currentUserAtom))

const addNote = useAtomSet(() => addNoteAtom, { mode: 'promise' })
const text = ref('')
const clientLists = ref(0)

onMounted(() => {
  clientLists.value = clientStats.lists
})

watch(notes, () => {
  clientLists.value = clientStats.lists
})

async function submit() {
  if (!text.value.trim()) return
  await addNote({ author, text: text.value })
  text.value = ''
  clientLists.value = clientStats.lists
}
</script>

<template>
  <main>
    <h1>Notes for {{ author }}</h1>

    <p data-testid="rendered-user">
      registry says the current user is: {{ renderedUser }}
    </p>

    <p data-testid="client-lists">
      client fetches since mount: {{ clientLists }}
    </p>

    <p
      v-if="AsyncResult.isInitial(notes)"
      data-testid="state"
    >
      loading…
    </p>
    <p
      v-else-if="AsyncResult.isFailure(notes)"
      data-testid="state"
    >
      failed
    </p>
    <ul
      v-else
      data-testid="notes"
    >
      <li
        v-for="note in notes.value"
        :key="note.id"
        data-testid="note"
      >
        {{ note.text }}
      </li>
    </ul>

    <form @submit.prevent="submit">
      <input
        v-model="text"
        placeholder="new note"
      >
      <button type="submit">
        Add
      </button>
    </form>

    <nav>
      <NuxtLink to="/status">
        status
      </NuxtLink>
      |
      <NuxtLink to="/?author=alice">
        alice
      </NuxtLink>
      |
      <NuxtLink to="/?author=bob">
        bob
      </NuxtLink>
    </nav>
  </main>
</template>
