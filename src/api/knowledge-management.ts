import apiClient from './index'
import type { KnowledgeDocument, KnowledgeDocumentQuery, KnowledgeDocumentPageResult } from '@/types/knowledge-management'

export const knowledgeManagementApi = {
  getList: (params: KnowledgeDocumentQuery): Promise<KnowledgeDocumentPageResult> => {
    return apiClient.get('/knowledge-documents', { params })
  },

  getById: (id: number): Promise<KnowledgeDocument> => {
    return apiClient.get(`/knowledge-documents/${id}`)
  },

  upload: (formData: FormData): Promise<KnowledgeDocument> => {
    return apiClient.post('/knowledge-documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  parse: (id: number): Promise<void> => {
    return apiClient.post(`/knowledge-documents/${id}/parse`)
  },

  slice: (id: number): Promise<void> => {
    return apiClient.post(`/knowledge-documents/${id}/slice`)
  },

  delete: (id: number): Promise<void> => {
    return apiClient.delete(`/knowledge-documents/${id}`)
  },

  batchDelete: (ids: number[]): Promise<void> => {
    return apiClient.post('/knowledge-documents/batch-delete', { ids })
  },

  download: (id: number): string => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || ''
    return `${baseURL}/knowledge-documents/${id}/download`
  },

  getKnowledgeBases: (): Promise<string[]> => {
    return apiClient.get('/knowledge-documents/knowledge-bases')
  }
}