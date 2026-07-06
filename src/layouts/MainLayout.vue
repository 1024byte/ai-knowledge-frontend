<template>
  <div class="main-layout">
    <el-container class="layout-container">
      <el-header class="layout-header">
        <div class="header-content">
          <div class="logo">
            <el-icon :size="24"><reading /></el-icon>
            <span>RAG 知识库</span>
          </div>
        </div>
      </el-header>

      <el-container class="body-container">
        <document-sidebar />
        <el-main class="chat-main">
          <chat-container />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { Reading } from '@element-plus/icons-vue'
import DocumentSidebar from '@/components/document/DocumentSidebar.vue'
import ChatContainer from '@/components/chat/ChatContainer.vue'
</script>

<style scoped lang="scss">
.main-layout {
  height: 100vh;
  overflow: hidden;
}

.layout-container {
  height: 100%;
}

.layout-header {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  padding: 0 20px;
  height: 56px;

  .header-content {
    display: flex;
    align-items: center;
    height: 100%;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }
}

.body-container {
  height: calc(100vh - 56px);
}

.chat-main {
  padding: 0;
  overflow: hidden;
}
</style>
