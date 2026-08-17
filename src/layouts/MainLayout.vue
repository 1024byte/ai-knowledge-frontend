<template>
  <div class="main-layout">
    <el-container class="layout-container">
      <el-header class="layout-header">
        <div class="header-content">
          <div class="logo">
            <el-icon :size="24"><reading /></el-icon>
            <span>RAG 知识库</span>
          </div>
          <div class="header-right">
            <span class="username" v-if="userStore.user">{{ userStore.user.username }}</span>
            <el-button text class="logout-btn" @click="handleLogout">
              <el-icon><SwitchButton /></el-icon>
              登出
            </el-button>
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
import { Reading, SwitchButton } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import DocumentSidebar from '@/components/document/DocumentSidebar.vue'
import ChatContainer from '@/components/chat/ChatContainer.vue'
import { authApi } from '@/api/auth'
import { clearAuth } from '@/utils/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const handleLogout = async () => {
  try {
    await authApi.logout()
  } catch {
    // 即使登出接口失败，也清除本地状态
  }
  clearAuth()
  localStorage.removeItem("knowledge_base_session_id")
  userStore.clearUser()
  ElMessage.success('已登出')
  router.push('/login')
}
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
    justify-content: space-between;
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

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .username {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }

  .logout-btn {
    font-size: 14px;
    color: var(--el-text-color-secondary);

    &:hover {
      color: var(--el-color-danger);
    }
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

