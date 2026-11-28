/** 业务类型：对话 / 查询改写 / 精排 */
export type BizType = 'CHAT' | 'REWRITE' | 'RERANK'

/** 供应商 */
export type ModelProvider = 'OPENAI_COMPAT' | 'OLLAMA' | 'ONNX' | 'DASHSCOPE' | 'AUTO'

/** Key 配置来源：NONE 未配置 / ENV 环境变量引用 / ENCRYPTED 加密存储 */
export type ApiKeyMode = 'NONE' | 'ENV' | 'ENCRYPTED'

/** 模型配置（接口不返回任何 Key 明文/密文） */
export interface ModelConfigVO {
  id: number
  bizType: BizType
  name: string
  provider: ModelProvider
  baseUrl: string | null
  modelName: string | null
  hasApiKey: boolean
  apiKeyMode: ApiKeyMode
  /** 环境变量名，仅 apiKeyMode=ENV 时有值；只是变量名，不是密钥，可安全回填 */
  apiKeyRef: string | null
  temperature: number | null
  maxTokens: number | null
  timeoutMs: number | null
  extraJson: Record<string, unknown> | null
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** 新增 / 修改请求体 */
export interface ModelConfigRequest {
  bizType?: BizType
  name?: string
  provider?: ModelProvider
  baseUrl?: string | null
  modelName?: string | null
  /** 明文 Key，服务端加密存储 */
  apiKey?: string
  /** 环境变量名，与 apiKey 二选一 */
  apiKeyRef?: string
  /** 仅修改接口有效：清空已保存的 Key */
  clearApiKey?: boolean
  temperature?: number | null
  maxTokens?: number | null
  timeoutMs?: number | null
  extraJson?: Record<string, unknown> | null
  sortOrder?: number
  /** 仅新增接口有效：创建后立即生效 */
  active?: boolean
}

/** 连通性测试结果（失败时外层 code 仍为 0） */
export interface ModelConfigTestResult {
  success: boolean
  message: string
  latencyMs: number
}
