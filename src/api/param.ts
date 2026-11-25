import apiClient from './index'
import type {
  ParamItemVO,
  ParamHistory,
  ParamSaveRequest,
  ParamSingleRequest
} from '@/types/param'

const BASE = '/params'

export const paramApi = {
  getList: (): Promise<ParamItemVO[]> => {
    return apiClient.get(BASE)
  },

  save: (data: ParamSaveRequest): Promise<null> => {
    return apiClient.post(`${BASE}/save`, data)
  },

  apply: (data: ParamSingleRequest): Promise<null> => {
    return apiClient.post(`${BASE}/apply`, data)
  },

  rollback: (data: ParamSingleRequest): Promise<null> => {
    return apiClient.post(`${BASE}/rollback`, data)
  },

  reset: (): Promise<null> => {
    return apiClient.post(`${BASE}/reset`)
  },

  history: (params: { paramKey?: string }): Promise<ParamHistory[]> => {
    return apiClient.get(`${BASE}/history`, { params })
  }
}