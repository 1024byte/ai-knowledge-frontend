/**
 * 检索策略
 * - hybrid：混合检索（向量 + BM25 融合）
 * - vector：仅向量检索
 * - bm25：仅 BM25 关键词检索
 */
export type RetrievalStrategy = 'hybrid' | 'vector' | 'bm25'

/** 召回测试请求体 */
export interface RecallTestRequest {
  /** 测试问题 */
  query: string
  /** 待检索的知识库 ID 列表 */
  kbIds: number[]
  /** 待检索的文档 ID 列表（为空表示所选知识库下全部文档） */
  documentIds: number[]
  /** 检索策略，默认 hybrid */
  strategy: RetrievalStrategy
  /** 返回数量（Top-K），默认 5 */
  topK: number
  /** 相似度阈值（0~1），低于该分数的结果将被过滤，默认 0.3 */
  threshold: number
  /** RRF 平滑系数 K，仅 hybrid 生效，默认 60 */
  rrfK: number
  /** 是否启用 Rerank 重排序，默认 false，仅 hybrid 生效 */
  enableRerank: boolean
  /** Rerank 阈值（0~1），低于该 Rerank 得分的片段将被过滤，默认 0.5 */
  rerankThreshold: number
}

/** 单条召回结果 */
export interface RecallResultItem {
  /** 片段 ID（切片表真实主键，用于「前往编辑」跳转） */
  chunkId: number
  /** 文档 ID（用于「前往编辑」跳转） */
  documentId: number
  /** 来源文档名（含扩展名） */
  source: string
  /** 所属知识库名称 */
  kbName: string
  /** 片段文本内容 */
  content: string
  /** 得分：fusion 为 RRF 分数，vector/bm25 为相似度（0~1） */
  score: number
  /** 向量召回排名（仅 fusion 结果有意义，单路未命中为 null） */
  vectorRank: number | null
  /** BM25 召回排名（仅 fusion 结果有意义，单路未命中为 null） */
  bm25Rank: number | null
  /** Rerank 精排得分（仅 rerank 列表有意义） */
  rerankScore?: number
  /** 粗排排名（原 RRF 排名），仅 rerank 列表有意义 */
  coarseRank?: number
  /** 精排排名（Rerank 后排名），仅 rerank 列表有意义 */
  rerankRank?: number
}

/** 召回测试响应 data（apiClient 已解包 Result.data） */
export interface RecallTestResult {
  /** 回显测试问题 */
  query: string
  /** 本次检索策略 */
  strategy: RetrievalStrategy
  /** 总耗时（毫秒） */
  totalMs: number
  /** 向量检索耗时（毫秒），仅 hybrid 时有值 */
  vectorMs: number | null
  /** BM25 检索耗时（毫秒），仅 hybrid 时有值 */
  bm25Ms: number | null
  /** Rerank 重排序耗时（毫秒），仅开启 Rerank 时有值 */
  rerankMs: number | null
  /** BM25 分词结果，vector 策略为空数组 */
  tokens: string[]
  /** 三路召回结果 */
  results: {
    fusion: RecallResultItem[]
    vector: RecallResultItem[]
    bm25: RecallResultItem[]
    rerank: RecallResultItem[]
  }
}