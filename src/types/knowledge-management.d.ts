export interface KnowledgeDocument {
  id: number
  title: string
  knowledgeBase: string
  fileName: string
  fileType: string
  fileSize: number
  parseStatus: 'parsed' | 'unparsed' | 'parsing'
  vectorStatus: 'vectorized' | 'unvectorized' | 'vectorizing'
  createdAt: string
}

export interface KnowledgeDocumentQuery {
  title?: string
  knowledgeBase?: string
  parseStatus?: string
  page?: number
  pageSize?: number
}

export interface KnowledgeDocumentPageResult {
  list: KnowledgeDocument[]
  total: number
  page: number
  pageSize: number
}