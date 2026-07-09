export interface UploadResponse {
  filename: string
  chunkCount: number
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
