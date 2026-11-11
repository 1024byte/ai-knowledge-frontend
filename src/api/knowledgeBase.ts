import apiClient from './index'
import type {
  KnowledgeBaseItem,
  KnowledgeBaseCreateRequest,
  KnowledgeBaseUpdateRequest,
  KnowledgeBaseListParams
} from '@/types/knowledge-base'

const BASE = '/knowledge-bases'

export const knowledgeBaseApi = {
  getList: (params?: KnowledgeBaseListParams) => {
    return apiClient.get<KnowledgeBaseItem[]>(BASE, { params })
  },

  getDetail: (id: number) => {
    return apiClient.get<KnowledgeBaseItem>(`${BASE}/${id}`)
  },

  create: (data: KnowledgeBaseCreateRequest) => {
    return apiClient.post<KnowledgeBaseItem>(BASE, data)
  },

  update: (id: number, data: KnowledgeBaseUpdateRequest) => {
    return apiClient.put<KnowledgeBaseItem>(`${BASE}/${id}`, data)
  },

  delete: (id: number) => {
    return apiClient.delete<null>(`${BASE}/${id}`)
  },

  updateStatus: (id: number, status: number) => {
    return apiClient.patch<null>(`${BASE}/${id}/status`, { status })
  }
}