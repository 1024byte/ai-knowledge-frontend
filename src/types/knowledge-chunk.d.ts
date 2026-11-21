export interface SavedChunkMetadata {
  content_type?: string
  parent_text?: string
  parent_start?: string
  parent_end?: string
  [key: string]: string | undefined
}

export interface SavedChunkItem {
  id: number
  index: number
  text: string
  tokenCount: number
  enabled: boolean
  vectorStatus: number
  vectorStatusText: string
  contextPrefix: string
  metadata: SavedChunkMetadata
}

export interface ChunkListResponse {
  documentId: number
  fileName: string
  totalChunks: number
  chunks: SavedChunkItem[]
}

export interface EditChunkRequest {
  text?: string | null
  contextPrefix?: string | null
  contentType?: string | null
  parentText?: string | null
  parentStart?: number | null
  parentEnd?: number | null
}

export interface MergeChunksRequest {
  documentId: number
  chunkIds: number[]
}

export interface SplitChunkRequest {
  documentId: number
  chunkId: number
  texts: string[]
}

export interface SetChunksEnabledRequest {
  chunkIds: number[]
  enabled: boolean
}