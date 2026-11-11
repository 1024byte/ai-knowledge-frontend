export interface KnowledgeBaseItem {
  id: number
  name: string
  description: string
  chunkLength: number
  overlapLength: number
  status: number
  createdAt: string
  updatedAt: string
  splitStrategy: string
  embeddingModel: string
  retrievalTopK: number
  similarityThreshold: number
}

export interface KnowledgeBaseCreateRequest {
  name: string
  description?: string
  chunkLength: number
  overlapLength: number
  splitStrategy?: string
  embeddingModel?: string
  retrievalTopK?: number
  similarityThreshold?: number
}

export interface KnowledgeBaseUpdateRequest {
  name?: string
  description?: string
  chunkLength?: number
  overlapLength?: number
  splitStrategy?: string
  embeddingModel?: string
  retrievalTopK?: number
  similarityThreshold?: number
}

export interface KnowledgeBaseListParams {
  page?: number
  pageSize?: number
  name?: string
  status?: number
}