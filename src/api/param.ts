import apiClient from './index'
import type {
  ParamItemVO,
  ParamHistory,
  ParamSaveRequest,
  ParamSingleRequest,
  ParamResetRequest
} from '@/types/param'

const BASE = '/params'

export const paramApi = {
  getList: (kbId?: number | null): Promise<ParamItemVO[]> => {
    return apiClient.get(BASE, { params: { kbId: kbId ?? undefined } })
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

  reset: (data: ParamResetRequest): Promise<null> => {
    return apiClient.post(`${BASE}/reset`, data)
  },

  history: (params: { kbId?: number | null; paramKey?: string }): Promise<ParamHistory[]> => {
    return apiClient.get(`${BASE}/history`, { params })
  }
}