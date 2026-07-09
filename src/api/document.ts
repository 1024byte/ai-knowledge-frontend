import apiClient from './index'
import type { AxiosProgressConfig } from '@/types/api'
import type { UploadResponse, DocumentRecord, DocumentFileRecord, CreateCategoryRequest } from '@/types/document'

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
  }
}
