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
    name: 'Home',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: {
      title: '智能问答',
      requiresAuth: true
    }
  },
  {
    path: '/document/:id',
    name: 'DocumentContent',
    component: () => import('@/views/DocumentContent.vue'),
    meta: {
      title: '文档内容',
      requiresAuth: true
    }
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
    next({ name: 'Home' })
    return
  }

  next()
})

export default router
