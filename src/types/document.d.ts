export interface UploadResponse {
  filename: string
  metaId: number
  message: string
}

export interface DocumentRecord {
  filename: string
  fileSize: number
  fileType: string
  uploadTime: number
  chunkCount: number
}

export interface CreateCategoryRequest {
  name: string
  description?: string
}

export interface DocumentFileRecord {
  id: number
  fileName: string
  fileType: string
  fileSize: number
  chunkCount: number
  uploadTime: string
  status: string
  errorMessage: string | null
}

export interface DocumentStatusInfo {
  id: number
  filename: string
  fileSize: number
  fileType: string
  uploadTime: number
  chunkCount: number
  status: string
  errorMessage: string | null
}