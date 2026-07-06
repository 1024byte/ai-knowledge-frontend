import apiClient from './index'
import type { AxiosProgressConfig } from '@/types/api'
import type { UploadResponse, DocumentRecord } from '@/types/document'

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
  }
}
