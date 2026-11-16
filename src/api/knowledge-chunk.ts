import apiClient from './index'
import type {
  ChunkListResponse,
  SavedChunkItem,
  EditChunkRequest,
  MergeChunksRequest,
  SplitChunkRequest,
  SetChunksEnabledRequest
} from '@/types/knowledge-chunk'

const BASE = '/knowledge-documents/chunks'

export const chunkApi = {
  getList: (documentId: number): Promise<ChunkListResponse> => {
    return apiClient.get(`${BASE}/document/${documentId}`)
  },

  update: (chunkId: number, data: EditChunkRequest): Promise<SavedChunkItem> => {
    return apiClient.put(`${BASE}/${chunkId}`, data)
  },

  merge: (data: MergeChunksRequest): Promise<SavedChunkItem> => {
    return apiClient.post(`${BASE}/merge`, data)
  },

  split: (data: SplitChunkRequest): Promise<SavedChunkItem[]> => {
    return apiClient.post(`${BASE}/split`, data)
  },

  setEnabled: (data: SetChunksEnabledRequest): Promise<SavedChunkItem[]> => {
    return apiClient.put(`${BASE}/enabled`, data)
  }
}