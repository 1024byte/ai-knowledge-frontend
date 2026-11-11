import apiClient from './index'
import type { KnowledgeDocument, KnowledgeDocumentQuery, KnowledgeDocumentPageResult, ChunksPreviewResponse, BatchChunkResult, DocumentContentResponse, SaveDocumentContentRequest, SaveChunksRequest } from '@/types/knowledge-management'

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

  parse: (id: number): Promise<KnowledgeDocument> => {
    return apiClient.post(`/knowledge-documents/${id}/parse`)
  },

  getContent: (id: number): Promise<DocumentContentResponse> => {
    return apiClient.get(`/knowledge-documents/${id}/content`)
  },

  saveContent: (id: number, data: SaveDocumentContentRequest): Promise<void> => {
    return apiClient.put(`/knowledge-documents/${id}/content`, data)
  },

  getChunks: (id: number): Promise<ChunksPreviewResponse> => {
    return apiClient.get(`/knowledge-documents/${id}/chunks`)
  },

  saveChunks: (id: number, data: SaveChunksRequest): Promise<void> => {
    return apiClient.put(`/knowledge-documents/${id}/chunks`, data)
  },

  autoChunkBatch: (ids: number[]): Promise<BatchChunkResult> => {
    return apiClient.post('/knowledge-documents/auto-chunk', ids)
  },

  vectorize: (id: number): Promise<KnowledgeDocument> => {
    return apiClient.post(`/knowledge-documents/${id}/vectorize`)
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
  }
}