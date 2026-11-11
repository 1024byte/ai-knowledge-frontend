<template>
  <div class="main-layout">
    <div class="main-panel">
      <chat-container @search-results="handleSearchResults" />
    </div>

    <div class="side-panel">
      <rag-references :search-results="searchResults" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ChatContainer from '@/components/chat/ChatContainer.vue'
import RagReferences from '@/components/chat/RagReferences.vue'
import type { SearchResult } from '@/types/chat'

const searchResults = ref<SearchResult[]>([])

const handleSearchResults = (results: SearchResult[]) => {
  searchResults.value = results
}
</script>

<style scoped lang="scss">
.main-layout {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.main-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.side-panel {
  width: 340px;
  min-width: 340px;
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}
</style>