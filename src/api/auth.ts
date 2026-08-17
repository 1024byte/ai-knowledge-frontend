import apiClient from './index'

export interface LoginRequest {
  username: string
  password: string
  deviceId: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  deviceId: string
  userId: number
  username: string
  role: string
}

export interface RefreshRequest {
  refreshToken: string
}

export interface RefreshResponse {
  accessToken: string
  refreshToken: string
}

export interface UserInfoResponse {
  userId: number
  username: string
  email: string
  role: string
}

export const authApi = {
  login: (data: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post('/auth/login', data)
  },

  register: (data: { username: string; password: string; email?: string; deviceId: string }): Promise<LoginResponse> => {
    return apiClient.post('/auth/register', data)
  },

  refresh: (data: RefreshRequest): Promise<RefreshResponse> => {
    return apiClient.post('/auth/refresh', data)
  },

  getUserInfo: (): Promise<UserInfoResponse> => {
    return apiClient.get('/auth/me')
  },

  logout: (): Promise<void> => {
    return apiClient.post('/auth/logout')
  }
}