import type { RecallTestResult } from './recall-test'

/** 评测运行状态 */
export type EvalRunState =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELED'

/** 评测集（列表） */
export interface EvalDatasetVO {
  id: number
  kbId: number
  kbName: string
  name: string
  description: string | null
  caseCount: number
  lastRunAt: string | null
  lastRunState: EvalRunState | null
  createdAt: string
  updatedAt: string
}

/** Case（评测集用例） */
export interface EvalCaseVO {
  id: number
  query: string
  relevantDocumentIds: number[]
  relevantDocuments: Array<{ id: number; name: string }>
  tags: string[]
  sortOrder: number
  createdAt: string
}

/** 评测集详情（含 cases） */
export interface EvalDatasetDetailVO extends EvalDatasetVO {
  cases: EvalCaseVO[]
}

/** 评测集列表查询参数 */
export interface EvalDatasetQuery {
  kbId?: number
  keyword?: string
}

/** Case 新增 / 修改请求体 */
export interface EvalCaseRequest {
  query?: string
  relevantDocumentIds?: number[]
  tags?: string[]
  sortOrder?: number
}

/** Run 创建请求体（enableRewrite 已由前端展开为布尔值） */
export interface EvalRunCreateRequest {
  datasetId: number
  name: string
  strategy: 'hybrid' | 'vector' | 'bm25'
  topK: number
  threshold?: number
  rrfK?: number
  enableRerank: boolean
  rerankStage?: 'fuse_rerank' | 'rerank_fuse'
  rerankThreshold?: number
  rerankMaxDocs?: number
  candidateMultiplier?: number
  maxCandidates?: number
  topN?: number
  enableRewrite: boolean
  excludeKeywords?: string[]
}

/** Run 配置快照 */
export interface EvalRunConfig {
  strategy: 'hybrid' | 'vector' | 'bm25'
  topK: number
  threshold?: number
  rrfK?: number
  enableRerank: boolean
  rerankStage?: string
  rerankThreshold?: number
  rerankMaxDocs?: number
  candidateMultiplier?: number
  maxCandidates?: number
  topN?: number
  enableRewrite: boolean
  excludeKeywords: string[]
}

/** 汇总指标（仅统计成功 Case；K 固定 1/3/5/10，NDCG 只有 @10） */
export interface EvalMetricsSummary {
  hitRate: Record<string, number>
  recall: Record<string, number>
  precision: Record<string, number>
  mrr: number
  ndcg: Record<string, number>
  avgMs: number
  p50Ms: number
  p95Ms: number
  rewriteAppliedRate: number
  successCount: number
  failedCount: number
}

/** Run 列表项 */
export interface EvalRunVO {
  id: number
  datasetId: number
  datasetName: string
  kbId: number
  kbName: string
  name: string
  state: EvalRunState
  progress: number
  totalCases: number
  hitRateAt5: number | null
  avgMs: number | null
  totalMs: number | null
  createdBy: string | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
}

/** Run 列表查询参数 */
export interface EvalRunQuery {
  datasetId?: number
  kbId?: number
  state?: string
  startAt?: string
  endAt?: string
  page?: number
  size?: number
}

/** Run 详情 */
export interface EvalRunDetailVO {
  id: number
  datasetId: number
  datasetName: string
  kbId: number
  kbName: string
  name: string
  state: EvalRunState
  progress: number
  totalCases: number
  successCount: number
  failedCount: number
  configSnapshot: EvalRunConfig
  paramSnapshot: Record<string, string>
  metricsSummary: EvalMetricsSummary | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  errorMessage: string | null
}

/** Run Case 列表项（不含 resultSnapshot） */
export interface EvalRunCaseVO {
  id: number
  caseId: number
  query: string
  tags: string[]
  relevantDocumentIds: number[]
  hit: boolean
  firstHitRank: number | null
  hitAtK: Record<string, boolean>
  recallAt5: number | null
  ndcgAt10: number | null
  mrr: number | null
  totalMs: number | null
  rewritePath: string | null
  rewrittenQuery: string | null
  errorMessage: string | null
}

/** Run Case 详情（含完整召回测试响应） */
export interface EvalRunCaseDetailVO extends EvalRunCaseVO {
  retrievedDocumentIds: number[]
  retrievedScores: number[]
  resultSnapshot: RecallTestResult | null
}

/** Run Case 列表查询参数 */
export interface EvalRunCaseQuery {
  page?: number
  size?: number
  onlyMissed?: boolean
  onlyFailed?: boolean
  tag?: string
}

/** 分页结果 */
export interface EvalPageResult<T> {
  total: number
  list: T[]
}
