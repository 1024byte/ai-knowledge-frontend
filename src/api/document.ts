import apiClient from './index'
import type { AxiosProgressConfig } from '@/types/api'
import type { UploadResponse, DocumentRecord, DocumentFileRecord, DocumentStatusInfo, CreateCategoryRequest } from '@/types/document'

const baseURL = import.meta.env.VITE_API_BASE_URL || ''

export const documentApi = {
  upload: (
    formData: FormData,
    config?: AxiosProgressConfig
  ): Promise<UploadResponse> => {
    return apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      ...config
    })
  },

  getList: (): Promise<DocumentRecord[]> => {
    return apiClient.get('/documents/list')
  },

  getCategories: (): Promise<string[]> => {
    return apiClient.get('/documents/categories')
  },

  createCategory: (data: CreateCategoryRequest): Promise<void> => {
    return apiClient.post('/documents/category', data)
  },

  deleteCategory: (name: string): Promise<void> => {
    return apiClient.delete(`/documents/category/${encodeURIComponent(name)}`)
  },

  getCategoryFiles: (categoryName: string): Promise<DocumentFileRecord[]> => {
    return apiClient.get(`/documents/category/${encodeURIComponent(categoryName)}`)
  },

  deleteDocument: (id: number): Promise<void> => {
    return apiClient.delete(`/documents/${id}`)
  },

  getDocumentContent: (id: number): Promise<string> => {
    return apiClient.get(`/documents/${id}/content`)
  },

  getDocumentContentUrl: (id: number): string => {
    return `${baseURL}/documents/${id}/content`
  },

  getDocumentStatus: (id: number): Promise<DocumentStatusInfo> => {
    return apiClient.get(`/documents/${id}/status`)
  },

  getSseUrl: (docId: number): string => {
    return `${baseURL}/documents/sse?docId=${docId}`
  }
}