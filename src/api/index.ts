import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResult } from '@/types/api'
import { getToken, getRefreshToken, setToken, setRefreshToken, clearAuth } from '@/utils/auth'

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

let isRefreshing = false
let pendingRequests: Array<{
  resolve: (token: string) => void
  reject: (error: any) => void
}> = []

const refreshTokenAndRetry = async (): Promise<string> => {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token')
  }

  const response = await axios.post<ApiResult<{ accessToken: string; refreshToken: string }>>(
    `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
    { refreshToken }
  )

  const result = response.data
  if (result.code !== 0) {
    throw new Error(result.message || 'Refresh failed')
  }

  const { accessToken, refreshToken: newRefreshToken } = result.data
  setToken(accessToken)
  setRefreshToken(newRefreshToken)
  return accessToken
}

const redirectToLogin = () => {
  clearAuth()
  const currentPath = window.location.pathname
  if (currentPath !== '/login') {
    window.location.href = '/login'
  }
}

apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResult>) => {
    const result = response.data
    if (result.code === 0) {
      return result.data as any
    }
    const message = result.message || '操作失败'
    ElMessage.error(message)
    return Promise.reject(new Error(message))
  },
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const status = error.response?.status

    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newToken = await refreshTokenAndRetry()

        pendingRequests.forEach(({ resolve }) => resolve(newToken))
        pendingRequests = []

        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        pendingRequests.forEach(({ reject }) => reject(refreshError))
        pendingRequests = []

        redirectToLogin()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (status === 401 && originalRequest._retry) {
      redirectToLogin()
      return Promise.reject(error)
    }

    const result = error.response?.data as ApiResult | undefined
    const message = result?.message || error.message || '请求失败'
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default apiClient