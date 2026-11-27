import axios from 'axios'
import apiClient from './index'
import { getToken } from '@/utils/auth'
import type {
  EvalCaseRequest,
  EvalDatasetDetailVO,
  EvalDatasetQuery,
  EvalDatasetVO,
  EvalPageResult,
  EvalRunCaseDetailVO,
  EvalRunCaseQuery,
  EvalRunCaseVO,
  EvalRunCreateRequest,
  EvalRunDetailVO,
  EvalRunQuery,
  EvalRunVO
} from '@/types/evaluation'

const BASE = '/evaluation'

/** 二进制下载（导出接口返回文件流，不走 Result 包装，需绕过拦截器） */
async function download(path: string, fallbackName: string) {
  const baseURL = import.meta.env.VITE_API_BASE_URL || ''
  const token = getToken()
  const resp = await axios.get(`${baseURL}${path}`, {
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })

  let fileName = fallbackName
  const disposition = resp.headers['content-disposition'] as string | undefined
  const matched = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  if (matched?.[1]) fileName = decodeURIComponent(matched[1])

  const url = window.URL.createObjectURL(new Blob([resp.data]))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export const evalApi = {
  // ---------- 评测集 ----------
  getDatasets: (params?: EvalDatasetQuery): Promise<EvalDatasetVO[]> =>
    apiClient.get(`${BASE}/datasets`, { params }),

  getDataset: (id: number): Promise<EvalDatasetDetailVO> =>
    apiClient.get(`${BASE}/datasets/${id}`),

  createDataset: (data: { kbId: number; name: string; description?: string }): Promise<{ id: number }> =>
    apiClient.post(`${BASE}/datasets`, data),

  updateDataset: (id: number, data: { name?: string; description?: string }): Promise<null> =>
    apiClient.put(`${BASE}/datasets/${id}`, data),

  deleteDataset: (id: number): Promise<null> =>
    apiClient.delete(`${BASE}/datasets/${id}`),

  // ---------- Case ----------
  addCase: (datasetId: number, data: EvalCaseRequest): Promise<{ id: number }> =>
    apiClient.post(`${BASE}/datasets/${datasetId}/cases`, data),

  addCasesBatch: (datasetId: number, cases: EvalCaseRequest[]): Promise<{ imported: number; failed: number }> =>
    apiClient.post(`${BASE}/datasets/${datasetId}/cases/batch`, { cases }),

  updateCase: (datasetId: number, caseId: number, data: EvalCaseRequest): Promise<null> =>
    apiClient.put(`${BASE}/datasets/${datasetId}/cases/${caseId}`, data),

  deleteCase: (datasetId: number, caseId: number): Promise<null> =>
    apiClient.delete(`${BASE}/datasets/${datasetId}/cases/${caseId}`),

  importCases: (datasetId: number, file: File): Promise<{ imported: number; failed: number; message?: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post(`${BASE}/datasets/${datasetId}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  exportDataset: (datasetId: number) =>
    download(`${BASE}/datasets/${datasetId}/export`, `evaluation-dataset-${datasetId}.json`),

  // ---------- 运行 ----------
  createRun: (data: EvalRunCreateRequest): Promise<{ id: number }> =>
    apiClient.post(`${BASE}/runs`, data),

  getRuns: (params?: EvalRunQuery): Promise<EvalPageResult<EvalRunVO>> =>
    apiClient.get(`${BASE}/runs`, { params }),

  getRun: (id: number): Promise<EvalRunDetailVO> =>
    apiClient.get(`${BASE}/runs/${id}`),

  cancelRun: (id: number): Promise<null> =>
    apiClient.post(`${BASE}/runs/${id}/cancel`),

  deleteRun: (id: number): Promise<null> =>
    apiClient.delete(`${BASE}/runs/${id}`),

  getRunCases: (id: number, params?: EvalRunCaseQuery): Promise<EvalPageResult<EvalRunCaseVO>> =>
    apiClient.get(`${BASE}/runs/${id}/cases`, { params }),

  getRunCaseDetail: (id: number, caseId: number): Promise<EvalRunCaseDetailVO> =>
    apiClient.get(`${BASE}/runs/${id}/cases/${caseId}`),

  exportRun: (id: number, format: 'json' | 'csv') =>
    download(`${BASE}/runs/${id}/export?format=${format}`, `evaluation-run-${id}.${format}`)
}
