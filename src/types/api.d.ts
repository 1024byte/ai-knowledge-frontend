import { AxiosRequestConfig } from 'axios'

export interface AxiosProgressConfig extends AxiosRequestConfig {
  onUploadProgress?: (progressEvent: ProgressEvent) => void
}

export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}