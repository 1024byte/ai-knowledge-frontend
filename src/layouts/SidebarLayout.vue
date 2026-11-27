<template>
  <div class="sidebar-layout">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <el-icon :size="22" class="logo-icon"><Reading /></el-icon>
        <span class="logo-text">AI 智能知识库</span>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <el-icon :size="18"><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="nav-item logout-item" @click="handleLogout">
          <el-icon :size="18"><SwitchButton /></el-icon>
          <span>退出系统</span>
        </div>
      </div>
    </aside>

    <div class="main-area">
      <header class="top-header">
        <div class="header-breadcrumb">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/home' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <el-dropdown trigger="click" @command="handleUserCommand">
          <div class="header-user">
            <el-avatar :size="32" class="user-avatar">
              <el-icon :size="18"><UserFilled /></el-icon>
            </el-avatar>
            <span class="user-name">{{ userStore.user?.username || '系统管理员' }}</span>
            <el-icon :size="14" class="user-arrow"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">
                <el-icon :size="14"><SwitchButton /></el-icon>
                <span>退出登录</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </header>

      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  HomeFilled,
  Setting,
  Document,
  FolderOpened,
  Folder,
  Collection,
  ChatDotRound,
  DataAnalysis,
  Search,
  Operation,
  SwitchButton,
  Reading,
  UserFilled,
  User,
  ArrowDown
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { authApi } from '@/api/auth'
import { clearAuth } from '@/utils/auth'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const menuItems = [
  { path: '/home', label: '系统看板', icon: HomeFilled },
  { path: '/ai-model', label: 'AI模型配置', icon: Setting },
  { path: '/prompt-template', label: 'Prompt模板管理', icon: Document },
  { path: '/knowledge-base', label: '知识库管理', icon: FolderOpened },
  { path: '/knowledge-management', label: '知识管理', icon: Folder },
  { path: '/knowledge-snippet', label: '知识片段管理', icon: Collection },
  { path: '/recall-test', label: '召回测试', icon: Search },
  { path: '/evaluation', label: '评测中心', icon: DataAnalysis },
  { path: '/param-management', label: '参数管理', icon: Operation },
  { path: '/member-management', label: '成员管理', icon: User },
  { path: '/chat', label: '智能问答', icon: ChatDotRound },
  { path: '/session-review', label: '会话记录评价', icon: DataAnalysis }
]

const pageTitleMap: Record<string, string> = {
  '/home': '系统看板',
  '/ai-model': 'AI模型配置',
  '/prompt-template': 'Prompt模板管理',
  '/knowledge-management': '知识管理',
  '/knowledge-base': '知识库管理',
  '/knowledge-snippet': '知识片段管理',
  '/recall-test': '召回测试',
  '/evaluation': '评测中心',
  '/param-management': '参数管理',
  '/member-management': '成员管理',
  '/chat': '智能问答',
  '/session-review': '会话记录评价'
}

const currentPageTitle = computed(() => {
  return pageTitleMap[route.path] || ''
})

const isActive = (path: string) => {
  return route.path === path
}

const handleUserCommand = (command: string) => {
  if (command === 'logout') {
    handleLogout()
  }
}

const handleLogout = async () => {
  try {
    await authApi.logout()
  } catch {
    // ignore
  }
  clearAuth()
  localStorage.removeItem('knowledge_base_session_id')
  userStore.clearUser()
  ElMessage.success('已登出')
  router.push('/login')
}
</script>

<style scoped lang="scss">
.sidebar-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 220px;
  min-width: 220px;
  background: #1e293b;
  color: #cbd5e1;
  display: flex;
  flex-direction: column;
  user-select: none;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  .logo-icon {
    color: #818cf8;
    flex-shrink: 0;
  }

  .logo-text {
    font-size: 16px;
    font-weight: 600;
    color: #f1f5f9;
    white-space: nowrap;
  }
}

.sidebar-nav {
  flex: 1;
  padding: 12px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  margin: 2px 8px;
  border-radius: 8px;
  font-size: 14px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #e2e8f0;
  }

  &.active {
    background: rgba(99, 102, 241, 0.15);
    color: #818cf8;

    .el-icon {
      color: #818cf8;
    }
  }

  .el-icon {
    flex-shrink: 0;
  }
}

.sidebar-footer {
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.logout-item {
  color: #94a3b8;

  &:hover {
    color: #f87171;
    background: rgba(248, 113, 113, 0.1);
  }
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #f1f5f9;
}

.top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 24px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.header-breadcrumb {
  :deep(.el-breadcrumb__item) {
    font-size: 14px;
  }
}

.header-user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  .user-avatar {
    background: #818cf8;
  }

  .user-name {
    font-size: 14px;
    color: #334155;
  }

  .user-arrow {
    color: #94a3b8;
  }
}

.main-content {
  flex: 1;
  overflow: auto;
  padding: 20px 24px;
}
</style>