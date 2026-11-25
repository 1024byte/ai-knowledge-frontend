/**
 * 检索策略
 * - hybrid：混合检索（向量 + BM25 融合）
 * - vector：仅向量检索
 * - bm25：仅 BM25 关键词检索
 */
export type RetrievalStrategy = 'hybrid' | 'vector' | 'bm25'

/**
 * Rerank 挂载阶段（仅 hybrid 生效）
 * - fuse_rerank：先 RRF 融合再精排（默认）
 * - rerank_fuse：两路各自精排后再 RRF（实验）
 */
export type RerankStage = 'fuse_rerank' | 'rerank_fuse'

/**
 * 最终结果实际使用的分数口径
 * - cosine：余弦相似度（0~1）
 * - bm25_normalized：按本批最高分归一化的 BM25（0~1）
 * - rrf：RRF 排序分（数值很小，约 0~0.03）
 * - rerank_logits：Cross-Encoder 精排分（可能为负）
 */
export type RecallScoreType = 'cosine' | 'bm25_normalized' | 'rrf' | 'rerank_logits'

/**
 * 查询改写路径
 * - LLM_REWRITE：大模型改写
 * - L1_RULE：固定规则映射（LLM 关闭或失败时降级）
 * - NONE：未改写
 */
export type RewritePath = 'LLM_REWRITE' | 'L1_RULE' | 'NONE'

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
  /** 是否启用 Rerank 重排序，默认 false，hybrid / vector / bm25 均生效 */
  enableRerank: boolean
  /** Rerank 阈值（logits，通常 -20~20），低于该得分的片段将被过滤，默认 -4.5 */
  rerankThreshold: number
  /** 候选池倍数（1~10），召回候选数 = topK × 倍数，默认后端 3 */
  candidateMultiplier?: number
  /** 候选池上限（1~500），默认后端 100 */
  maxCandidates?: number
  /** 精排候选上限（1~300），仅本次测试生效；不传则使用参数管理 rerank.maxDocs（默认 30） */
  rerankMaxDocs?: number
  /** 最终返回数量（1~50），不传则等于 topK */
  topN?: number
  /** Rerank 挂载阶段，仅 hybrid 生效，默认 fuse_rerank */
  rerankStage?: RerankStage
  /** 排除关键词（与生产链路阶段2 一致） */
  excludeKeywords?: string[]
  /** 是否启用查询改写：不传 = 跟随参数管理 queryRewrite.enabled；true/false 仅覆盖本次测试 */
  enableRewrite?: boolean
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
  /** 该项在所属列表中的原始分：fusion 为 RRF 分，vector 为余弦相似度，bm25 为归一化 BM25，rerank 为粗排基准分 */
  score: number
  /** 向量召回排名（仅 fusion 结果有意义，单路未命中为 null） */
  vectorRank: number | null
  /** BM25 召回排名（仅 fusion 结果有意义，单路未命中为 null） */
  bm25Rank: number | null
  /** Rerank 精排得分（Cross-Encoder logits，可能为负数），仅 rerank / final 列表有意义 */
  rerankScore: number | null
  /** 粗排排名（1-based），仅 rerank 列表有意义 */
  coarseRank: number | null
  /** 精排排名（1-based），仅 rerank 列表有意义 */
  rerankRank: number | null
}

/** 召回测试响应 data（apiClient 已解包 Result.data） */
export interface RecallTestResult {
  /** 回显测试问题（原始 query） */
  query: string
  /** 实际用于检索的 query（改写生效时与 query 不同） */
  rewrittenQuery: string
  /** 是否执行了查询改写流程 */
  rewriteApplied: boolean
  /** 改写耗时（毫秒），未执行为 null */
  rewriteMs: number | null
  /** 改写路径：LLM_REWRITE / L1_RULE / NONE */
  rewritePath: RewritePath
  /** 改写保真度（0~1） */
  rewriteConfidence: number
  /** 改写产生的子查询（仅展示，本次未展开检索） */
  rewriteSubQueries: string[]
  /** 改写生效的排除关键词 */
  rewriteExcludeKeywords: string[]
  /** 本次检索策略 */
  strategy: RetrievalStrategy
  /** 总耗时（毫秒，含改写耗时） */
  totalMs: number
  /** 向量检索耗时（毫秒） */
  vectorMs: number | null
  /** BM25 检索耗时（毫秒） */
  bm25Ms: number | null
  /** Rerank 重排序耗时（毫秒） */
  rerankMs: number | null
  /** 本次是否实际执行了 Rerank（用户开启但候选为空时为 false） */
  rerankApplied: boolean
  /** 本次最终结果实际使用的分数口径 */
  scoreType: RecallScoreType
  /** BM25 分词结果，vector 策略为空数组 */
  tokens: string[]
  /** 各路召回结果 */
  results: {
    /** 最终结果，展示主表应优先使用该字段 */
    final: RecallResultItem[]
    fusion: RecallResultItem[]
    vector: RecallResultItem[]
    bm25: RecallResultItem[]
    rerank: RecallResultItem[]
  }
}
