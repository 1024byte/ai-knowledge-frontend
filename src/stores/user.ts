import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getUserInfo, setUserInfo, removeUserInfo, getToken } from '@/utils/auth'
import type { UserInfo } from '@/utils/auth'

export const useUserStore = defineStore('user', () => {
  const user = ref<UserInfo | null>(getUserInfo())
  const isLoggedIn = computed(() => !!getToken())

  const saveUser = (info: UserInfo) => {
    user.value = info
    setUserInfo(info)
  }

  const clearUser = () => {
    user.value = null
    removeUserInfo()
  }

  return {
    user,
    isLoggedIn,
    saveUser,
    clearUser
  }
})
