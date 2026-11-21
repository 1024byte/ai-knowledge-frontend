export interface KnowledgeDocument {
  id: number
  kbId: number
  title: string
  fileName: string
  fileExt: string
  fileSize: number
  fileUrl: string
  fileHash: string
  parsedTextUrl: string | null
  status: number // 0-待处理, 1-处理中, 2-已完成, 3-失败（纯解析状态）
  isVectorized: number | null // null=未触发, 0=待向量化, 1=向量化中, 2=已完成, 4=部分失败, 5=全部失败
  parseStatus: 'unparsed' | 'parsing' | 'parsed' | 'failed'
  vectorStatus: 'unvectorized' | 'vectorizing' | 'vectorized' | 'partial_failed' | 'all_failed'
  errorMessage: string | null
  chunkCount: number
  tokenCount: number
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface KnowledgeDocumentQuery {
  kbId?: number
  pageNum?: number
  pageSize?: number
  fileName?: string
  status?: number
}

export interface KnowledgeDocumentPageResult {
  records: KnowledgeDocument[]
  total: number
  size: number
  current: number
  pages: number
}

export interface ChunkMetadata {
  content_type?: string
  parent_text?: string
  parent_start?: string
  parent_end?: string
  [key: string]: string | undefined
}

export interface ChunkItem {
  index: number
  text: string
  tokenCount: number
  contextPrefix: string
  enabled?: boolean
  vectorStatus?: number
  vectorStatusText?: string
  metadata: ChunkMetadata
}

export interface ChunksPreviewResponse {
  documentId: number
  fileName: string
  totalChunks: number
  chunks: ChunkItem[]
}

export interface SaveChunksRequest {
  confirm?: boolean
  chunks: ChunkItem[]
}

export interface DocumentContentResponse {
  documentId: number
  fileName: string
  content: string
}

export interface SaveDocumentContentRequest {
  content: string
  confirm?: boolean
}

export interface FailureItem {
  id: number
  message: string
}

export interface BatchChunkResult {
  total: number
  success: number
  failures: FailureItem[]
}