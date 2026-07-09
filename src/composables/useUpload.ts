import { ref } from 'vue'
import { documentApi } from '@/api/document'
import type { UploadResponse } from '@/types/document'

const ALLOWED_EXTENSIONS = ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx', '.jpg', '.jpeg', '.png']
const MAX_FILE_SIZE = 10 * 1024 * 1024

export function validateFile(file: File): { valid: boolean; message?: string } {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      message: `不支持的文件类型: ${ext}。仅支持 ${ALLOWED_EXTENSIONS.join(', ')}`
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      message: `文件大小超出限制，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB`
    }
  }

  return { valid: true }
}

export function useUpload() {
  const uploadProgress = ref(0)
  const isUploading = ref(false)

  const uploadFile = async (file: File, category?: string): Promise<UploadResponse> => {
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.message)
    }

    isUploading.value = true
    uploadProgress.value = 0

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (category) {
        formData.append('category', category)
      }

      const response = await documentApi.upload(formData, {
        onUploadProgress: (progressEvent: ProgressEvent) => {
          if (progressEvent.total) {
            uploadProgress.value = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
          }
        }
      })

      return response
    } finally {
      isUploading.value = false
      uploadProgress.value = 0
    }
  }

  const uploadFiles = async (files: File[], category?: string) => {
    const results = []
    for (const file of files) {
      try {
        const result = await uploadFile(file, category)
        results.push({ file, success: true, result })
      } catch (error: any) {
        results.push({ file, success: false, error: error.message })
      }
    }
    return results
  }

  return {
    uploadFile,
    uploadFiles,
    uploadProgress,
    isUploading,
    validateFile
  }
}
