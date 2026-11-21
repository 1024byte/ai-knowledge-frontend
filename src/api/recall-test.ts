import apiClient from './index'
import type { RecallTestRequest, RecallTestResult } from '@/types/recall-test'

const BASE = '/recall-test'

export const recallTestApi = {
  run: (data: RecallTestRequest): Promise<RecallTestResult> => {
    return apiClient.post(`${BASE}/run`, data)
  }
}