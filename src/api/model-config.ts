import apiClient from './index'
import type {
  BizType,
  ModelConfigRequest,
  ModelConfigTestResult,
  ModelConfigVO
} from '@/types/model-config'

const BASE = '/model-config'

export const modelConfigApi = {
  /** 查询配置列表；不传 bizType 查全部 */
  getList: (bizType?: BizType): Promise<ModelConfigVO[]> =>
    apiClient.get(BASE, { params: bizType ? { bizType } : undefined }),

  create: (data: ModelConfigRequest): Promise<number> =>
    apiClient.post(BASE, data),

  update: (id: number, data: ModelConfigRequest): Promise<null> =>
    apiClient.put(`${BASE}/${id}`, data),

  remove: (id: number): Promise<null> =>
    apiClient.delete(`${BASE}/${id}`),

  activate: (id: number): Promise<null> =>
    apiClient.post(`${BASE}/${id}/activate`),

  test: (id: number): Promise<ModelConfigTestResult> =>
    apiClient.post(`${BASE}/${id}/test`),

  reload: (): Promise<null> =>
    apiClient.post(`${BASE}/reload`)
}
