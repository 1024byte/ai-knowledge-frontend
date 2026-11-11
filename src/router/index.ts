import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { getToken } from '@/utils/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: {
      title: '登录',
      requiresAuth: false
    }
  },
  {
    path: '/',
    component: () => import('@/layouts/SidebarLayout.vue'),
    meta: {
      requiresAuth: true
    },
    redirect: '/knowledge-management',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/HomePage.vue'),
        meta: {
          title: '系统首页'
        }
      },
      {
        path: 'ai-model',
        name: 'AIModelConfig',
        component: () => import('@/views/AIModelConfig.vue'),
        meta: {
          title: 'AI模型配置'
        }
      },
      {
        path: 'prompt-template',
        name: 'PromptTemplate',
        component: () => import('@/views/PromptTemplate.vue'),
        meta: {
          title: 'Prompt模板管理'
        }
      },
      {
        path: 'knowledge-management',
        name: 'KnowledgeManagement',
        component: () => import('@/views/KnowledgeManagement.vue'),
        meta: {
          title: '知识管理'
        }
      },
      {
        path: 'knowledge-base',
        name: 'KnowledgeBaseManagement',
        component: () => import('@/views/KnowledgeBaseManagement.vue'),
        meta: {
          title: '知识库管理'
        }
      },
      {
        path: 'knowledge-snippet',
        name: 'KnowledgeSnippet',
        component: () => import('@/views/KnowledgeSnippet.vue'),
        meta: {
          title: '知识片段管理'
        }
      },
      {
        path: 'chat',
        name: 'Chat',
        component: () => import('@/layouts/MainLayout.vue'),
        meta: {
          title: '智能问答'
        }
      },
      {
        path: 'session-review',
        name: 'SessionReview',
        component: () => import('@/views/SessionReview.vue'),
        meta: {
          title: '会话记录评价'
        }
      },
      {
        path: 'document/:id',
        name: 'DocumentContent',
        component: () => import('@/views/DocumentContent.vue'),
        meta: {
          title: '文档内容'
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: '页面未找到',
      requiresAuth: false
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const title = to.meta.title as string
  document.title = title ? `${title} - RAG 知识库` : 'RAG 知识库'

  const requiresAuth = to.meta.requiresAuth !== false
  const token = getToken()

  if (requiresAuth && !token) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  if (to.name === 'Login' && token) {
    next({ name: 'KnowledgeManagement' })
    return
  }

  next()
})

export default router