<template>
  <div class="main-layout">
    <el-container class="layout-container">
      <document-sidebar />
      <el-main class="chat-main">
        <chat-container />
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import DocumentSidebar from '@/components/document/DocumentSidebar.vue'
import ChatContainer from '@/components/chat/ChatContainer.vue'
</script>

<style scoped lang="scss">
.main-layout {
  height: 100%;
  overflow: hidden;
}

.layout-container {
  height: 100%;
}

.chat-main {
  padding: 0;
  overflow: hidden;
}
</style>