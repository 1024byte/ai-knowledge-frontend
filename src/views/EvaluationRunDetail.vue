<template>
  <div class="eval-run-detail">
    <!-- 顶部 -->
    <div class="run-header">
      <div class="run-header-left">
        <el-button text @click="$router.back()" class="back-btn">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </el-button>
        <div class="run-title-block">
          <div class="run-title-row">
            <el-tag :type="stateTagType(run.state)" effect="light" size="large">
              {{ stateLabel(run.state) }}
            </el-tag>
            <h2 class="run-title">{{ run.name }}</h2>
          </div>
          <div class="run-meta">
            <span>评测集：{{ run.datasetName }}</span>
            <span class="dot">·</span>
            <span>知识库：{{ run.kbName }}</span>
            <span class="dot">·</span>
            <span>创建人：{{ run.createdBy ?? '-' }}</span>
            <span class="dot">·</span>
            <span>开始：{{ formatTime(run.startedAt ?? run.createdAt) }}</span>
            <span v-if="run.finishedAt" class="dot">·</span>
            <span v-if="run.finishedAt">结束：{{ formatTime(run.finishedAt) }}</span>
          </div>
        </div>
      </div>
      <div class="run-header-right">
        <el-dropdown @command="handleExport">
          <el-button>
            <el-icon><Download /></el-icon>
            <span>导出报告</span>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="json">导出 JSON</el-dropdown-item>
              <el-dropdown-item command="csv">导出 CSV</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button @click="showSnapshot = !showSnapshot">
          <el-icon><InfoFilled /></el-icon>
          <span>{{ showSnapshot ? '隐藏' : '查看' }}配置快照</span>
        </el-button>
        <el-button type="primary" plain :disabled="run.state === 'PENDING'" @click="goRecallTest">
          <el-icon><Promotion /></el-icon>
          <span>复现到召回测试</span>
        </el-button>
        <el-button
          v-if="run.state === 'RUNNING'"
          type="warning"
          plain
          @click="cancelRun"
        >
          <el-icon><VideoPause /></el-icon>
          <span>取消运行</span>
        </el-button>
      </div>
    </div>

    <!-- 运行中进度条 -->
    <el-progress
      v-if="run.state === 'RUNNING'"
      :percentage="progressPercent"
      :stroke-width="4"
      :show-text="false"
      class="progress-bar"
    />

    <!-- 配置快照 -->
    <el-collapse v-if="showSnapshot" class="snapshot-collapse">
      <el-collapse-item title="配置与参数快照（不可修改，用于保证可复现）" :name="'main'">
        <div class="snapshot-block">
          <h4>config_snapshot（检索配置）</h4>
          <pre>{{ pretty(run.configSnapshot) }}</pre>
        </div>
        <div class="snapshot-block">
          <h4>param_snapshot（运行时生效参数）</h4>
          <pre>{{ pretty(run.paramSnapshot) }}</pre>
        </div>
      </el-collapse-item>
    </el-collapse>

    <!-- 汇总指标卡片 -->
    <template v-if="run.metricsSummary">
      <el-row :gutter="16" class="metrics-grid">
        <el-col :xs="12" :sm="6">
          <div class="metric-card metric-card--primary">
            <div class="metric-label">Hit Rate@5</div>
            <div class="metric-value-big">{{ formatPercent(run.metricsSummary!.hitRate['5']) }}</div>
            <div class="metric-sub">主指标 · Top-5 命中占比</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="metric-card">
            <div class="metric-label">MRR</div>
            <div class="metric-value-big">{{ run.metricsSummary.mrr.toFixed(2) }}</div>
            <div class="metric-sub">平均倒数排名</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="metric-card">
            <div class="metric-label">NDCG@10</div>
            <div class="metric-value-big">{{ run.metricsSummary.ndcg['10'].toFixed(2) }}</div>
            <div class="metric-sub">归一化折损累计增益</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="metric-card">
            <div class="metric-label">Hit Rate@10</div>
            <div class="metric-value-big">{{ formatPercent(run.metricsSummary.hitRate['10']) }}</div>
            <div class="metric-sub">Top-10 命中占比</div>
          </div>
        </el-col>

        <el-col :xs="12" :sm="4">
          <div class="metric-card metric-card--stats">
            <div class="metric-label">平均耗时</div>
            <div class="metric-value-median">{{ run.metricsSummary.avgMs }} ms</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="4">
          <div class="metric-card metric-card--stats">
            <div class="metric-label">P50 耗时</div>
            <div class="metric-value-median">{{ run.metricsSummary.p50Ms }} ms</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="4">
          <div class="metric-card metric-card--stats">
            <div class="metric-label">P95 耗时</div>
            <div class="metric-value-median">{{ run.metricsSummary.p95Ms }} ms</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="4">
          <div class="metric-card metric-card--stats">
            <div class="metric-label">改写执行率</div>
            <div class="metric-value-median">{{ formatPercent(run.metricsSummary.rewriteAppliedRate) }}</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="4">
          <div class="metric-card metric-card--stats">
            <div class="metric-label">成功 Case</div>
            <div class="metric-value-median good">{{ run.metricsSummary.successCount }}</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="4">
          <div class="metric-card metric-card--stats">
            <div class="metric-label">失败 Case</div>
            <div class="metric-value-median" :class="run.metricsSummary.failedCount > 0 ? 'bad' : ''">
              {{ run.metricsSummary.failedCount }}
            </div>
          </div>
        </el-col>
      </el-row>
    </template>

    <!-- 失败/未完成占位 -->
    <div v-else-if="run.state !== 'RUNNING' && run.state !== 'PENDING'" class="placeholder-card">
      <el-icon :size="32" color="#f56c6c"><WarningFilled /></el-icon>
      <p>运行未成功结束，无汇总指标。</p>
      <p v-if="run.errorMessage" class="error-detail">{{ run.errorMessage }}</p>
    </div>
    <div v-else class="placeholder-card placeholder-card--loading">
      <el-icon :size="28" class="spin"><Loading /></el-icon>
      <p>运行进行中（{{ run.progress }} / {{ run.totalCases }}），指标将在结束后生成。</p>
    </div>

    <!-- 分 K 指标表 -->
    <template v-if="run.metricsSummary">
      <section class="section-card">
        <h3 class="section-title">分 K 指标</h3>
        <p class="section-note">
          分母为成功 Case 数；Precision 分母取实际返回去重文档数；NDCG 仅统计 @10；CANCELED 时展示已完成部分的指标。
        </p>
        <el-table :data="kRows" stripe size="default" class="k-table">
          <el-table-column prop="k" label="K" width="80" align="center">
            <template #default="{ row }"><strong>@{{ row.k }}</strong></template>
          </el-table-column>
          <el-table-column label="Hit Rate" width="160" align="center">
            <template #default="{ row }">{{ formatPercent(row.hitRate) }}</template>
          </el-table-column>
          <el-table-column label="Recall" width="160" align="center">
            <template #default="{ row }">{{ formatPercent(row.recall) }}</template>
          </el-table-column>
          <el-table-column label="Precision" width="160" align="center">
            <template #default="{ row }">{{ formatPercent(row.precision) }}</template>
          </el-table-column>
          <el-table-column label="NDCG" width="160" align="center">
            <template #default="{ row }">{{ row.ndcg }}</template>
          </el-table-column>
        </el-table>
      </section>
    </template>

    <!-- Case 明细 -->
    <section class="section-card">
      <div class="section-title-row">
        <h3 class="section-title">Case 明细（{{ cases.length }} / {{ run.totalCases }}）</h3>
        <div class="case-filters">
          <el-switch v-model="filterOnlyMissed" active-text="只看未命中" />
          <el-switch v-model="filterOnlyFailed" active-text="只看失败" />
        </div>
      </div>

      <el-table :data="filteredCases" stripe class="cases-table" @expand-change="onExpandChange">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="case-expand-content">
              <div v-if="caseLoadingIds.has(row.id)" class="expand-loading">
                <el-icon class="spin"><Loading /></el-icon>
                <span>加载召回详情…</span>
              </div>
              <div v-else-if="expandInfo(row)" class="expand-inner">
                <div class="expand-head">
                  <h4>召回结果</h4>
                  <span class="muted-text">
                    策略 {{ expandInfo(row)?.strategy }} · 耗时 {{ expandInfo(row)?.totalMs }}ms
                    <template v-if="expandInfo(row)?.rerankApplied">（含精排）</template>
                  </span>
                </div>
                <div
                  v-for="(item, idx) in expandInfo(row)?.items"
                  :key="item.chunkId"
                  class="recall-item"
                >
                  <div class="recall-rank">#{{ idx + 1 }}</div>
                  <div class="recall-main">
                    <div class="recall-source">
                      {{ item.source }}
                      <el-tag
                        v-if="row.relevantDocumentIds.includes(item.documentId)"
                        size="small"
                        type="success"
                        class="hit-tag"
                      >
                        命中标注
                      </el-tag>
                    </div>
                    <div class="recall-content">{{ item.content }}</div>
                  </div>
                  <div class="recall-score" :class="{ 'is-hit': row.relevantDocumentIds.includes(item.documentId) }">
                    {{ formatScore(item.score) }}
                  </div>
                </div>
                <div v-if="(expandInfo(row)?.items.length ?? 0) === 0" class="muted-text">无召回结果</div>
              </div>
              <div v-else class="muted-text">该 Case 未保存结果快照</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="query" label="问题" min-width="260">
          <template #default="{ row }">
            <div class="query-cell">
              <span>{{ row.query }}</span>
              <div v-if="row.tags?.length" class="query-tags">
                <el-tag v-for="t in row.tags" :key="t" size="small" effect="plain" type="info">{{ t }}</el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="命中" width="80" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.hit" color="#16a34a" :size="18"><Select /></el-icon>
            <el-icon v-else color="#dc2626" :size="18"><Close /></el-icon>
          </template>
        </el-table-column>
        <el-table-column label="首个命中排名" width="120" align="center">
          <template #default="{ row }">
            <span v-if="row.firstHitRank" class="rank-badge">#{{ row.firstHitRank }}</span>
            <span v-else class="muted-text">-</span>
          </template>
        </el-table-column>
        <el-table-column label="Rec@5" width="90" align="center">
          <template #default="{ row }">{{ formatPercent(row.recallAt5) }}</template>
        </el-table-column>
        <el-table-column label="NDCG@10" width="100" align="center">
          <template #default="{ row }">{{ formatNumber(row.ndcgAt10) }}</template>
        </el-table-column>
        <el-table-column label="MRR" width="80" align="center">
          <template #default="{ row }">{{ formatNumber(row.mrr) }}</template>
        </el-table-column>
        <el-table-column label="耗时" width="90" align="center">
          <template #default="{ row }">{{ row.totalMs == null ? '-' : `${row.totalMs}ms` }}</template>
        </el-table-column>
        <el-table-column label="改写" width="120" align="center">
          <template #default="{ row }">
            <el-tag
              v-if="row.rewritePath && row.rewritePath !== 'NONE'"
              size="small"
              type="success"
            >
              {{ rewriteShortLabel(row.rewritePath) }}
            </el-tag>
            <span v-else class="muted-text">未改写</span>
          </template>
        </el-table-column>
        <el-table-column label="错误" width="160">
          <template #default="{ row }">
            <span v-if="row.errorMessage" class="error-text">{{ row.errorMessage }}</span>
            <span v-else class="muted-text">-</span>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Close,
  Download,
  InfoFilled,
  Loading,
  Promotion,
  Select,
  VideoPause,
  WarningFilled
} from '@element-plus/icons-vue'
import { evalApi } from '@/api/evaluation'
import type {
  EvalRunCaseDetailVO,
  EvalRunCaseVO,
  EvalRunDetailVO,
  EvalRunState
} from '@/types/evaluation'

const route = useRoute()
const router = useRouter()

const runId = Number(route.params.id)
const run = ref<EvalRunDetailVO>({
  id: runId,
  datasetId: 0,
  datasetName: '-',
  kbId: 0,
  kbName: '-',
  name: '-',
  state: 'PENDING',
  progress: 0,
  totalCases: 0,
  successCount: 0,
  failedCount: 0,
  configSnapshot: {
    strategy: 'hybrid',
    topK: 10,
    enableRerank: false,
    enableRewrite: true,
    excludeKeywords: []
  },
  paramSnapshot: {},
  metricsSummary: null,
  startedAt: null,
  finishedAt: null,
  createdAt: '-',
  errorMessage: null
})
const cases = ref<EvalRunCaseVO[]>([])
/** caseId -> 详情；null 表示加载失败/无快照 */
const caseDetails = ref<Record<number, EvalRunCaseDetailVO | null>>({})
const caseLoadingIds = ref<Set<number>>(new Set())
const showSnapshot = ref(false)
const filterOnlyMissed = ref(false)
const filterOnlyFailed = ref(false)

let pollTimer: ReturnType<typeof setInterval> | null = null

async function fetchRun() {
  run.value = await evalApi.getRun(runId)
  if (run.value.state !== 'RUNNING' && pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}
async function fetchCases() {
  const res = await evalApi.getRunCases(runId, { page: 1, size: 200 })
  cases.value = res.list
}

async function fetchCaseDetail(row: EvalRunCaseVO) {
  if (row.id in caseDetails.value) return
  caseLoadingIds.value.add(row.id)
  try {
    const detail = await evalApi.getRunCaseDetail(runId, row.id)
    caseDetails.value = { ...caseDetails.value, [row.id]: detail }
  } catch {
    caseDetails.value = { ...caseDetails.value, [row.id]: null }
  } finally {
    caseLoadingIds.value.delete(row.id)
  }
}

function onExpandChange(row: EvalRunCaseVO, expandedRows: EvalRunCaseVO[]) {
  if (expandedRows.some((r) => r.id === row.id)) fetchCaseDetail(row)
}

function expandInfo(row: EvalRunCaseVO) {
  const snapshot = caseDetails.value[row.id]?.resultSnapshot
  if (!snapshot) return null
  return {
    strategy: snapshot.strategy,
    totalMs: snapshot.totalMs,
    rerankApplied: snapshot.rerankApplied,
    items: snapshot.results?.final ?? []
  }
}

async function cancelRun() {
  try {
    await ElMessageBox.confirm(`确认取消运行「${run.value.name}」？`, '取消运行', { type: 'warning' })
  } catch {
    return
  }
  await evalApi.cancelRun(runId)
  ElMessage.success('已请求取消')
  await fetchRun()
}

async function handleExport(format: 'json' | 'csv') {
  await evalApi.exportRun(runId, format)
}

function goRecallTest() {
  router.push({ path: '/recall-test', query: { fromRun: runId } })
}

// ---------- computed ----------
const progressPercent = computed(() => {
  if (!run.value.totalCases) return 0
  return Math.round((run.value.progress / run.value.totalCases) * 100)
})
const kRows = computed(() => {
  const m = run.value.metricsSummary
  if (!m) return []
  return [1, 3, 5, 10].map((k) => ({
    k,
    hitRate: m.hitRate[String(k)],
    recall: m.recall[String(k)],
    precision: m.precision[String(k)],
    ndcg: k === 10 ? (m.ndcg['10'] ?? 0).toFixed(2) : '-'
  }))
})
const filteredCases = computed(() => {
  return cases.value.filter((c) => {
    if (filterOnlyMissed.value && c.hit) return false
    if (filterOnlyFailed.value && !c.errorMessage) return false
    return true
  })
})

// ---------- helpers ----------
const stateTagType = (s: EvalRunState) => {
  switch (s) {
    case 'RUNNING': return 'primary'
    case 'SUCCESS': return 'success'
    case 'FAILED': return 'danger'
    case 'CANCELED': return 'warning'
    default: return 'info'
  }
}
const stateLabel = (s: EvalRunState) => {
  const map: Record<EvalRunState, string> = {
    PENDING: '待启动',
    RUNNING: '运行中',
    SUCCESS: '成功',
    FAILED: '失败',
    CANCELED: '已取消'
  }
  return map[s] ?? s
}
const formatPercent = (v: number | null | undefined) =>
  v == null ? '-' : `${(v * 100).toFixed(0)}%`
const formatNumber = (v: number | null | undefined, digits = 2) =>
  v == null ? '-' : v.toFixed(digits)
const formatTime = (iso: string | null | undefined) =>
  iso ? iso.replace('T', ' ').slice(0, 16) : '-'
const formatScore = (v: number | null | undefined) =>
  v == null ? '-' : Math.abs(v) >= 1 ? v.toFixed(3) : v.toFixed(4)
const rewriteShortLabel = (p: string | null) => {
  if (p === 'LLM_REWRITE') return 'LLM'
  if (p === 'L1_RULE') return 'L1'
  if (!p || p === 'NONE') return '未改写'
  return p
}
const pretty = (o: unknown) => JSON.stringify(o, null, 2)

// ---------- lifecycle ----------
onMounted(async () => {
  await fetchRun()
  await fetchCases()
  if (run.value.state === 'RUNNING') {
    pollTimer = setInterval(async () => {
      await fetchRun()
    }, 2000)
  }
})
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped lang="scss">
.eval-run-detail {
  padding: 20px 24px;
  background: #f8fafc;
  min-height: calc(100vh - 60px);
}

.run-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 8px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);

  .run-header-left {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .run-title-block {
    flex: 1;
  }
  .run-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }
  .run-title {
    font-size: 20px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }
  .run-meta {
    color: #64748b;
    font-size: 13px;
    line-height: 20px;
    span { margin-right: 2px; }
    .dot { color: #cbd5e1; margin: 0 6px; }
  }
  .run-header-right {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .back-btn {
    color: #64748b;
    :deep(.el-icon) { margin-right: 2px; }
  }
}

.progress-bar {
  margin-bottom: 12px;
  border-radius: 2px;
}

.snapshot-collapse {
  background: #fff;
  border-radius: 8px;
  margin-bottom: 12px;
  :deep(.el-collapse-item__header) { font-weight: 600; color: #1e293b; }
  .snapshot-block {
    margin-bottom: 12px;
    h4 { margin: 0 0 6px; font-size: 13px; color: #334155; font-weight: 600; }
    pre {
      margin: 0;
      padding: 12px;
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 4px;
      font-size: 12px;
      line-height: 1.6;
      overflow-x: auto;
    }
  }
}

.metrics-grid {
  margin-bottom: 16px;
}
.metric-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 12px;

  &--primary { border-color: #6366f1; background: linear-gradient(135deg, #eef2ff, #fff); }
  &--stats { padding: 10px 12px; }

  .metric-label {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 4px;
  }
  .metric-value-big {
    font-size: 28px;
    font-weight: 700;
    color: #1e293b;
    font-family: ui-monospace, Menlo, monospace;
    line-height: 1.2;
  }
  .metric-value-median {
    font-size: 20px;
    font-weight: 600;
    color: #1e293b;
    font-family: ui-monospace, Menlo, monospace;
    &.good { color: #16a34a; }
    &.bad  { color: #dc2626; }
  }
  .metric-sub {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
  }
}

.section-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  .case-filters { display: flex; gap: 12px; }
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 12px;
}
.section-title-row + .section-title {
  margin: 0;
}

.k-table :deep(.el-table__cell) { padding-top: 10px; padding-bottom: 10px; }
.k-table td:nth-child(2) { background: #f8fafc; font-variant-numeric: tabular-nums; }

.placeholder-card {
  background: #fff;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  color: #64748b;
  margin-bottom: 16px;

  p { margin: 8px 0; }
  .error-detail { color: #dc2626; font-size: 13px; }

  &--loading .spin { color: #6366f1; animation: spin 1.2s linear infinite; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.cases-table {
  :deep(.el-table__cell) { vertical-align: middle; }
}
.query-cell {
  font-size: 14px;
  color: #1e293b;
  .query-tags { margin-top: 4px; display: flex; gap: 4px; flex-wrap: wrap; }
}
.muted-text { color: #94a3b8; font-size: 13px; }
.error-text { color: #dc2626; font-size: 13px; }
.rank-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  background: #eef2ff;
  color: #4f46e5;
  font-weight: 600;
  font-size: 12px;
}

.case-expand-content {
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 6px;

  .expand-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #64748b;
    font-size: 13px;
  }
  .expand-inner h4 {
    margin: 0 0 10px;
    font-size: 13px;
    color: #475569;
  }
}

.recall-item {
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 6px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;

  .recall-rank {
    flex-shrink: 0;
    width: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: #64748b;
    font-size: 13px;
  }
  .recall-main { flex: 1; min-width: 0; }
  .recall-source {
    font-size: 12px;
    color: #2563eb;
    margin-bottom: 2px;
    font-family: ui-monospace, Menlo, monospace;
  }
  .recall-content {
    font-size: 13px;
    color: #334155;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .recall-score {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding: 0 10px;
    font-family: ui-monospace, Menlo, monospace;
    font-weight: 600;
    color: #475569;
    border-left: 1px solid #e2e8f0;
    &.is-hit { color: #16a34a; }
  }
}
</style>
