<template>
  <div class="evaluation-center">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">评测中心</h2>
        <p class="page-subtitle">批量运行检索链路，产出可复现的指标报告</p>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="main-tabs" @tab-change="onTabChange">
      <!-- ========== Tab 1: 评测集 ========== -->
      <el-tab-pane label="评测集" name="datasets">
        <div class="tab-toolbar">
          <el-input
            v-model="datasetKeyword"
            placeholder="按名称搜索"
            clearable
            class="toolbar-search"
            :prefix-icon="Search"
            @keyup.enter="reloadDatasets"
            @clear="reloadDatasets"
          />
          <el-select
            v-model="datasetKbFilter"
            placeholder="按知识库过滤"
            clearable
            class="toolbar-filter"
            @change="reloadDatasets"
          >
            <el-option v-for="kb in kbOptions" :key="kb.id" :label="kb.name" :value="kb.id" />
          </el-select>
          <div class="toolbar-right">
            <el-button type="primary" @click="openCreateDataset">
              <el-icon><Plus /></el-icon>
              <span>新建评测集</span>
            </el-button>
          </div>
        </div>

        <el-table v-loading="datasetLoading" :data="datasets" stripe class="dataset-table">
          <el-table-column label="名称" min-width="220">
            <template #default="{ row }">
              <div class="dataset-name-cell" @click="openDatasetDetail(row)">
                <span class="dataset-name">{{ row.name }}</span>
                <span v-if="row.description" class="dataset-desc">{{ row.description }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="kbName" label="知识库" width="150" />
          <el-table-column prop="caseCount" label="Case 数" width="100" align="center" />
          <el-table-column label="最近运行" width="200">
            <template #default="{ row }">
              <template v-if="row.lastRunAt">
                <div class="last-run-at">{{ formatTime(row.lastRunAt) }}</div>
                <el-tag v-if="row.lastRunState" :type="stateTagType(row.lastRunState)" size="small">
                  {{ stateLabel(row.lastRunState) }}
                </el-tag>
              </template>
              <span v-else class="muted-text">尚未运行</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="170" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openDatasetDetail(row)">详情</el-button>
              <el-button link type="primary" size="small" @click="openEditDataset(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="removeDataset(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ========== Tab 2: 运行记录 ========== -->
      <el-tab-pane label="运行记录" name="runs">
        <div class="tab-toolbar">
          <el-select
            v-model="runKbFilter"
            placeholder="按知识库过滤"
            clearable
            class="toolbar-filter"
            @change="reloadRuns"
          >
            <el-option v-for="kb in kbOptions" :key="kb.id" :label="kb.name" :value="kb.id" />
          </el-select>
          <el-select
            v-model="runStateFilter"
            placeholder="按状态过滤"
            clearable
            class="toolbar-filter"
            @change="reloadRuns"
          >
            <el-option label="待启动" value="PENDING" />
            <el-option label="运行中" value="RUNNING" />
            <el-option label="成功" value="SUCCESS" />
            <el-option label="失败" value="FAILED" />
            <el-option label="已取消" value="CANCELED" />
          </el-select>
          <el-date-picker
            v-model="runDateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DDTHH:mm:ss"
            class="toolbar-date"
            @change="reloadRuns"
          />
          <div class="toolbar-right">
            <el-tooltip
              :disabled="!hasActiveRun"
              content="已有评测正在运行，请等待完成或先取消"
              placement="top"
            >
              <span>
                <el-button type="primary" :disabled="hasActiveRun" @click="openCreateRun">
                  <el-icon><VideoPlay /></el-icon>
                  <span>新建运行</span>
                </el-button>
              </span>
            </el-tooltip>
          </div>
        </div>

        <el-table v-loading="runLoading" :data="runs" stripe class="run-table">
          <el-table-column label="运行名称" min-width="200">
            <template #default="{ row }">
              <el-link type="primary" :underline="false" @click="goRunDetail(row.id)">
                {{ row.name }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="datasetName" label="评测集" width="180" />
          <el-table-column prop="kbName" label="知识库" width="140" />
          <el-table-column label="状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="stateTagType(row.state)" size="small" effect="light">
                {{ stateLabel(row.state) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="进度" width="180">
            <template #default="{ row }">
              <el-progress
                v-if="row.state === 'RUNNING'"
                :percentage="row.totalCases ? Math.round((row.progress / row.totalCases) * 100) : 0"
                :stroke-width="6"
              />
              <span v-else class="progress-text">{{ row.progress }} / {{ row.totalCases }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Hit Rate@5" width="110" align="center">
            <template #default="{ row }">
              <span v-if="row.hitRateAt5 != null" class="metric-value">{{ formatPercent(row.hitRateAt5) }}</span>
              <span v-else class="muted-text">-</span>
            </template>
          </el-table-column>
          <el-table-column label="平均耗时" width="120" align="center">
            <template #default="{ row }">
              <span v-if="row.avgMs != null" class="metric-value">{{ row.avgMs }}ms</span>
              <span v-else class="muted-text">-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="170" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="goRunDetail(row.id)">查看</el-button>
              <el-button
                v-if="row.state === 'RUNNING' || row.state === 'PENDING'"
                link
                type="warning"
                size="small"
                @click="cancelRun(row)"
              >
                取消
              </el-button>
              <el-button link type="danger" size="small" @click="removeRun(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-row">
          <el-pagination
            v-model:current-page="runPage"
            :page-size="runPageSize"
            :total="runTotal"
            layout="total, prev, pager, next"
            @current-change="reloadRuns"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- ========== 新建 / 编辑评测集 Dialog ========== -->
    <el-dialog
      v-model="datasetDialogVisible"
      :title="editingDatasetId ? '编辑评测集' : '新建评测集'"
      width="480px"
    >
      <el-form :model="datasetForm" label-width="90px">
        <el-form-item label="名称" required>
          <el-input v-model="datasetForm.name" placeholder="例如：产品核心功能回归集" />
        </el-form-item>
        <el-form-item v-if="!editingDatasetId" label="知识库" required>
          <el-select v-model="datasetForm.kbId" class="full-width" placeholder="选择知识库">
            <el-option v-for="kb in kbOptions" :key="kb.id" :label="kb.name" :value="kb.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="datasetForm.description" type="textarea" :rows="3" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="datasetDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="datasetSaving" @click="confirmSaveDataset">保存</el-button>
      </template>
    </el-dialog>

    <!-- ========== 评测集详情 Drawer ========== -->
    <el-drawer v-model="detailVisible" :title="detail?.name ?? '评测集详情'" size="72%">
      <div v-if="detail" class="dataset-detail">
        <div class="detail-meta">
          <span>知识库：{{ detail.kbName }}</span>
          <span class="dot">·</span>
          <span>Case 数：{{ detail.caseCount }}</span>
          <span class="dot">·</span>
          <span>创建时间：{{ formatTime(detail.createdAt) }}</span>
        </div>

        <div class="detail-toolbar">
          <el-button type="primary" size="small" @click="openCaseDialog()">
            <el-icon><Plus /></el-icon>
            <span>新增 Case</span>
          </el-button>
          <el-button size="small" @click="exportDataset">导出 JSON</el-button>
          <el-upload
            :show-file-list="false"
            accept=".json"
            :http-request="handleImport"
            class="import-upload"
          >
            <el-button size="small" :loading="importing">导入 JSON</el-button>
          </el-upload>
        </div>

        <el-table v-loading="caseLoading" :data="detail.cases" stripe size="small">
          <el-table-column type="index" width="60" label="#" />
          <el-table-column prop="query" label="问题" min-width="240" />
          <el-table-column label="相关文档" min-width="200">
            <template #default="{ row }">
              <div class="doc-tags">
                <el-tag
                  v-for="doc in row.relevantDocuments"
                  :key="doc.id"
                  size="small"
                  effect="plain"
                  type="info"
                >
                  {{ doc.name }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="标签" width="160">
            <template #default="{ row }">
              <el-tag v-for="t in row.tags" :key="t" size="small" class="tag-gap">{{ t }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sortOrder" label="排序" width="80" align="center" />
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openCaseDialog(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="removeCase(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-drawer>

    <!-- ========== 新增 / 编辑 Case Dialog ========== -->
    <el-dialog
      v-model="caseDialogVisible"
      :title="editingCaseId ? '编辑 Case' : '新增 Case'"
      width="600px"
    >
      <el-form :model="caseForm" label-width="90px">
        <el-form-item label="问题" required>
          <el-input v-model="caseForm.query" type="textarea" :rows="3" placeholder="测试问题" />
        </el-form-item>
        <el-form-item label="相关文档" required>
          <el-select
            v-model="caseForm.relevantDocumentIds"
            multiple
            filterable
            remote
            reserve-keyword
            :remote-method="searchDocuments"
            :loading="docLoading"
            class="full-width"
            placeholder="按文件名搜索并选择相关文档"
          >
            <el-option
              v-for="doc in docOptions"
              :key="doc.id"
              :label="doc.fileName"
              :value="doc.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-select
            v-model="caseForm.tags"
            multiple
            filterable
            allow-create
            clearable
            class="full-width"
            placeholder="回车添加标签"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="caseForm.sortOrder" :min="0" :max="9999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="caseDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="caseSaving" @click="confirmSaveCase">保存</el-button>
      </template>
    </el-dialog>

    <!-- ========== 新建运行 Dialog ========== -->
    <el-dialog v-model="showCreateRun" title="新建评测运行" width="780px">
      <el-alert type="info" :closable="false" show-icon class="run-alert">
        <template #title>
          配置与当前生效参数将整体快照，运行期间改参数不影响本次评测。评测与线上问答共用 Rerank / 本地
          LLM 资源，建议在低峰期运行。
        </template>
      </el-alert>
      <div class="run-dialog-body">
        <div class="run-section">
          <h4 class="run-section-title">基本信息</h4>
          <el-form :model="runForm" label-width="100px">
            <el-form-item label="运行名称" required>
              <el-input v-model="runForm.name" />
            </el-form-item>
            <el-form-item label="评测集" required>
              <el-select v-model="runForm.datasetId" class="full-width">
                <el-option
                  v-for="ds in datasets"
                  :key="ds.id"
                  :label="`${ds.name} （${ds.caseCount}条）`"
                  :value="ds.id"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </div>

        <div class="run-section">
          <h4 class="run-section-title">检索策略</h4>
          <el-form :model="runForm" label-width="100px">
            <el-form-item label="策略">
              <el-radio-group v-model="runForm.strategy">
                <el-radio-button value="hybrid">混合检索</el-radio-button>
                <el-radio-button value="vector">仅向量</el-radio-button>
                <el-radio-button value="bm25">仅 BM25</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="Top-K">
              <el-input-number v-model="runForm.topK" :min="1" :max="50" />
              <span class="field-hint">上限 50</span>
            </el-form-item>
            <el-form-item label="相似度阈值">
              <el-slider v-model="runForm.threshold" :min="0" :max="1" :step="0.05" class="full-width" />
              <span class="muted-text small">{{ runForm.threshold }}</span>
            </el-form-item>
            <el-form-item v-if="runForm.strategy === 'hybrid'" label="RRF 平滑系数">
              <el-input-number v-model="runForm.rrfK" :min="1" :max="200" />
            </el-form-item>
          </el-form>
        </div>

        <div class="run-section">
          <h4 class="run-section-title">精排设置</h4>
          <el-form :model="runForm" label-width="100px">
            <el-form-item label="启用 Rerank">
              <el-switch v-model="runForm.enableRerank" />
            </el-form-item>
            <template v-if="runForm.enableRerank">
              <el-form-item label="精排阈值">
                <el-slider v-model="runForm.rerankThreshold" :min="-20" :max="20" :step="0.5" class="full-width" />
                <span class="muted-text small">{{ runForm.rerankThreshold }}</span>
              </el-form-item>
              <el-form-item v-if="runForm.strategy === 'hybrid'" label="Rerank 阶段">
                <el-radio-group v-model="runForm.rerankStage">
                  <el-radio value="fuse_rerank">先融合再精排</el-radio>
                  <el-radio value="rerank_fuse">先精排再融合</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="候选池倍数">
                <el-input-number v-model="runForm.candidateMultiplier" :min="1" :max="10" />
              </el-form-item>
              <el-form-item label="候选池上限">
                <el-input-number v-model="runForm.maxCandidates" :min="1" :max="500" />
              </el-form-item>
              <el-form-item label="精排候选上限">
                <el-input-number v-model="runForm.rerankMaxDocs" :min="1" :max="300" />
              </el-form-item>
              <el-form-item label="最终返回数">
                <el-input-number v-model="runForm.topN" :min="1" :max="50" />
              </el-form-item>
            </template>
          </el-form>
        </div>

        <div class="run-section">
          <h4 class="run-section-title">查询改写</h4>
          <el-form :model="runForm" label-width="100px">
            <el-form-item label="启用改写">
              <el-radio-group v-model="runForm.rewriteMode">
                <el-radio value="follow">跟随参数管理</el-radio>
                <el-radio value="on">强制开启</el-radio>
                <el-radio value="off">强制关闭</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="排除关键词">
              <el-select
                v-model="runForm.excludeKeywords"
                multiple
                filterable
                allow-create
                clearable
                class="full-width"
                placeholder="可手动输入，回车添加"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>
      <template #footer>
        <el-button @click="showCreateRun = false">取消</el-button>
        <el-button type="primary" :loading="creatingRun" @click="confirmCreateRun">
          创建并启动
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type UploadRequestOptions } from 'element-plus'
import { Plus, Search, VideoPlay } from '@element-plus/icons-vue'
import { evalApi } from '@/api/evaluation'
import { knowledgeBaseApi } from '@/api/knowledgeBase'
import { knowledgeManagementApi } from '@/api/knowledge-management'
import { paramApi } from '@/api/param'
import type { KnowledgeBaseItem } from '@/types/knowledge-base'
import type {
  EvalCaseVO,
  EvalDatasetDetailVO,
  EvalDatasetVO,
  EvalRunState,
  EvalRunVO
} from '@/types/evaluation'

const router = useRouter()

// ---------- Tab & 基础数据 ----------
const activeTab = ref<'datasets' | 'runs'>('datasets')
const kbOptions = ref<KnowledgeBaseItem[]>([])

// ---------- 评测集 ----------
const datasets = ref<EvalDatasetVO[]>([])
const datasetLoading = ref(false)
const datasetKeyword = ref('')
const datasetKbFilter = ref<number | null>(null)

const reloadDatasets = async () => {
  datasetLoading.value = true
  try {
    datasets.value = await evalApi.getDatasets({
      kbId: datasetKbFilter.value ?? undefined,
      keyword: datasetKeyword.value.trim() || undefined
    })
  } finally {
    datasetLoading.value = false
  }
}

// 新建 / 编辑评测集
const datasetDialogVisible = ref(false)
const datasetSaving = ref(false)
const editingDatasetId = ref<number | null>(null)
const datasetForm = reactive<{ kbId: number | null; name: string; description: string }>({
  kbId: null,
  name: '',
  description: ''
})

const openCreateDataset = () => {
  editingDatasetId.value = null
  datasetForm.kbId = kbOptions.value[0]?.id ?? null
  datasetForm.name = ''
  datasetForm.description = ''
  datasetDialogVisible.value = true
}

const openEditDataset = (row: EvalDatasetVO) => {
  editingDatasetId.value = row.id
  datasetForm.kbId = row.kbId
  datasetForm.name = row.name
  datasetForm.description = row.description ?? ''
  datasetDialogVisible.value = true
}

const confirmSaveDataset = async () => {
  if (!datasetForm.name.trim()) {
    ElMessage.warning('名称不能为空')
    return
  }
  if (!editingDatasetId.value && !datasetForm.kbId) {
    ElMessage.warning('请选择知识库')
    return
  }
  datasetSaving.value = true
  try {
    if (editingDatasetId.value) {
      await evalApi.updateDataset(editingDatasetId.value, {
        name: datasetForm.name.trim(),
        description: datasetForm.description
      })
    } else {
      await evalApi.createDataset({
        kbId: datasetForm.kbId!,
        name: datasetForm.name.trim(),
        description: datasetForm.description
      })
    }
    ElMessage.success('保存成功')
    datasetDialogVisible.value = false
    await reloadDatasets()
  } finally {
    datasetSaving.value = false
  }
}

const removeDataset = async (row: EvalDatasetVO) => {
  try {
    await ElMessageBox.confirm(`确认删除评测集「${row.name}」？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  await evalApi.deleteDataset(row.id)
  ElMessage.success('已删除')
  await reloadDatasets()
}

// ---------- 评测集详情 ----------
const detailVisible = ref(false)
const detail = ref<EvalDatasetDetailVO | null>(null)
const caseLoading = ref(false)

const openDatasetDetail = async (row: EvalDatasetVO) => {
  detailVisible.value = true
  caseLoading.value = true
  try {
    detail.value = await evalApi.getDataset(row.id)
  } finally {
    caseLoading.value = false
  }
}

const reloadDetail = async () => {
  if (!detail.value) return
  caseLoading.value = true
  try {
    detail.value = await evalApi.getDataset(detail.value.id)
  } finally {
    caseLoading.value = false
  }
  await reloadDatasets()
}

const exportDataset = async () => {
  if (!detail.value) return
  await evalApi.exportDataset(detail.value.id)
}

const importing = ref(false)
const handleImport = async (options: UploadRequestOptions) => {
  if (!detail.value) return
  importing.value = true
  try {
    const res = await evalApi.importCases(detail.value.id, options.file as File)
    ElMessage.success(`导入完成：成功 ${res.imported} 条，失败 ${res.failed} 条`)
    if (res.message) ElMessage.warning(res.message)
    await reloadDetail()
  } finally {
    importing.value = false
  }
}

// Case 编辑
const caseDialogVisible = ref(false)
const caseSaving = ref(false)
const editingCaseId = ref<number | null>(null)
const caseForm = reactive<{
  query: string
  relevantDocumentIds: number[]
  tags: string[]
  sortOrder: number
}>({ query: '', relevantDocumentIds: [], tags: [], sortOrder: 0 })

const docOptions = ref<Array<{ id: number; fileName: string }>>([])
const docLoading = ref(false)

const searchDocuments = async (keyword: string) => {
  if (!detail.value) return
  docLoading.value = true
  try {
    const res = await knowledgeManagementApi.getList({
      kbId: detail.value.kbId,
      pageNum: 1,
      pageSize: 50,
      fileName: keyword || undefined
    })
    docOptions.value = res.records.map((d) => ({ id: d.id, fileName: d.fileName }))
  } finally {
    docLoading.value = false
  }
}

const openCaseDialog = (row?: EvalCaseVO) => {
  editingCaseId.value = row?.id ?? null
  caseForm.query = row?.query ?? ''
  caseForm.relevantDocumentIds = row ? [...row.relevantDocumentIds] : []
  caseForm.tags = row ? [...row.tags] : []
  caseForm.sortOrder = row?.sortOrder ?? 0
  // 预置已有关联文档，保证回显
  docOptions.value = row ? row.relevantDocuments.map((d) => ({ id: d.id, fileName: d.name })) : []
  caseDialogVisible.value = true
  if (!row) searchDocuments('')
}

const confirmSaveCase = async () => {
  if (!detail.value) return
  if (!caseForm.query.trim()) {
    ElMessage.warning('问题不能为空')
    return
  }
  if (caseForm.relevantDocumentIds.length === 0) {
    ElMessage.warning('请至少选择一篇相关文档')
    return
  }
  caseSaving.value = true
  try {
    const payload = {
      query: caseForm.query.trim(),
      relevantDocumentIds: caseForm.relevantDocumentIds,
      tags: caseForm.tags,
      sortOrder: caseForm.sortOrder
    }
    if (editingCaseId.value) {
      await evalApi.updateCase(detail.value.id, editingCaseId.value, payload)
    } else {
      await evalApi.addCase(detail.value.id, payload)
    }
    ElMessage.success('保存成功')
    caseDialogVisible.value = false
    await reloadDetail()
  } finally {
    caseSaving.value = false
  }
}

const removeCase = async (row: EvalCaseVO) => {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm('确认删除该 Case？', '删除确认', { type: 'warning' })
  } catch {
    return
  }
  await evalApi.deleteCase(detail.value.id, row.id)
  ElMessage.success('已删除')
  await reloadDetail()
}

// ---------- 运行记录 ----------
const runs = ref<EvalRunVO[]>([])
const runLoading = ref(false)
const runKbFilter = ref<number | null>(null)
const runStateFilter = ref('')
const runDateRange = ref<[string, string] | null>(null)
const runPage = ref(1)
const runPageSize = ref(10)
const runTotal = ref(0)

const hasActiveRun = computed(() =>
  runs.value.some((r) => r.state === 'PENDING' || r.state === 'RUNNING')
)

const reloadRuns = async () => {
  runLoading.value = true
  try {
    const res = await evalApi.getRuns({
      kbId: runKbFilter.value ?? undefined,
      state: runStateFilter.value || undefined,
      startAt: runDateRange.value?.[0],
      endAt: runDateRange.value?.[1],
      page: runPage.value,
      size: runPageSize.value
    })
    runs.value = res.list
    runTotal.value = res.total
  } finally {
    runLoading.value = false
  }
}

const onTabChange = () => {
  if (activeTab.value === 'runs') reloadRuns()
  else reloadDatasets()
}

const cancelRun = async (row: EvalRunVO) => {
  try {
    await ElMessageBox.confirm(`确认取消运行「${row.name}」？`, '取消运行', { type: 'warning' })
  } catch {
    return
  }
  await evalApi.cancelRun(row.id)
  ElMessage.success('已请求取消')
  await reloadRuns()
}

const removeRun = async (row: EvalRunVO) => {
  try {
    await ElMessageBox.confirm(`确认删除运行「${row.name}」及其全部明细？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  await evalApi.deleteRun(row.id)
  ElMessage.success('已删除')
  await reloadRuns()
}

const goRunDetail = (id: number) => {
  router.push({ name: 'EvaluationRunDetail', params: { id: id.toString() } })
}

// ---------- 新建运行 ----------
const showCreateRun = ref(false)
const creatingRun = ref(false)
const runForm = reactive({
  datasetId: 0,
  name: '',
  strategy: 'hybrid' as 'hybrid' | 'vector' | 'bm25',
  topK: 20,
  threshold: 0.3,
  rrfK: 60,
  enableRerank: true,
  rerankStage: 'fuse_rerank' as 'fuse_rerank' | 'rerank_fuse',
  rerankThreshold: -4.5,
  candidateMultiplier: 3,
  maxCandidates: 100,
  rerankMaxDocs: 30,
  topN: 10,
  rewriteMode: 'follow' as 'follow' | 'on' | 'off',
  excludeKeywords: [] as string[]
})

/** 读取参数管理的当前生效值，用于"跟随"语义与默认值 */
const loadEffectiveParams = async () => {
  try {
    const params = await paramApi.getList()
    const map = params.reduce<Record<string, string>>((acc, p) => {
      acc[p.paramKey] = p.effectiveValue
      return acc
    }, {})
    const num = (key: string) => {
      const v = Number(map[key])
      return Number.isFinite(v) ? v : undefined
    }
    runForm.threshold = num('retrieval.minScore') ?? num('retrieval.vectorMinScore') ?? runForm.threshold
    runForm.rrfK = num('retrieval.rrfK') ?? runForm.rrfK
    runForm.rerankThreshold = num('rerank.minScore') ?? runForm.rerankThreshold
    runForm.rerankMaxDocs = num('rerank.maxDocs') ?? runForm.rerankMaxDocs
    runForm.topK = num('retrieval.topK') ?? runForm.topK
    rewriteEffective.value = map['queryRewrite.enabled'] !== 'false'
  } catch {
    // 参数读取失败不阻塞弹窗，使用默认值
  }
}

const openCreateRun = async () => {
  await loadEffectiveParams()
  if (datasets.value.length === 0) await reloadDatasets()
  const defaultDs = datasets.value[0]
  runForm.datasetId = defaultDs?.id ?? 0
  runForm.name = `${defaultDs?.name ?? '评测集'} - ${new Date().toISOString().slice(0, 10)}`
  showCreateRun.value = true
}

const confirmCreateRun = async () => {
  if (!runForm.datasetId || !runForm.name.trim()) {
    ElMessage.warning('评测集和运行名称不能为空')
    return
  }
  creatingRun.value = true
  try {
    const res = await evalApi.createRun({
      datasetId: runForm.datasetId,
      name: runForm.name.trim(),
      strategy: runForm.strategy,
      topK: runForm.topK,
      threshold: runForm.threshold,
      rrfK: runForm.rrfK,
      enableRerank: runForm.enableRerank,
      rerankStage: runForm.strategy === 'hybrid' ? runForm.rerankStage : undefined,
      rerankThreshold: runForm.enableRerank ? runForm.rerankThreshold : undefined,
      candidateMultiplier: runForm.enableRerank ? runForm.candidateMultiplier : undefined,
      maxCandidates: runForm.enableRerank ? runForm.maxCandidates : undefined,
      rerankMaxDocs: runForm.enableRerank ? runForm.rerankMaxDocs : undefined,
      topN: runForm.enableRerank ? runForm.topN : undefined,
      enableRewrite: resolveRewrite(),
      excludeKeywords: runForm.excludeKeywords
    })
    ElMessage.success('运行已创建')
    showCreateRun.value = false
    await reloadRuns()
    goRunDetail(res.id)
  } finally {
    creatingRun.value = false
  }
}

// enableRewrite 三态在前端展开为布尔值；"跟随"使用参数管理生效值
const rewriteEffective = ref(true)
const resolveRewrite = () => {
  if (runForm.rewriteMode === 'on') return true
  if (runForm.rewriteMode === 'off') return false
  return rewriteEffective.value
}

// ---------- 展示工具 ----------
const stateTagType = (s: EvalRunState | null | undefined) => {
  switch (s) {
    case 'RUNNING': return 'primary'
    case 'SUCCESS': return 'success'
    case 'FAILED': return 'danger'
    case 'CANCELED': return 'warning'
    default: return 'info'
  }
}
const stateLabel = (s: EvalRunState | null | undefined) => {
  const map: Record<EvalRunState, string> = {
    PENDING: '待启动',
    RUNNING: '运行中',
    SUCCESS: '成功',
    FAILED: '失败',
    CANCELED: '已取消'
  }
  return s ? map[s] : '-'
}
const formatPercent = (v: number) => `${(v * 100).toFixed(0)}%`
const formatTime = (iso: string | null | undefined) => (iso ? iso.replace('T', ' ').slice(0, 16) : '-')

onMounted(async () => {
  try {
    kbOptions.value = await knowledgeBaseApi.getList()
  } catch {
    kbOptions.value = []
  }
  await reloadDatasets()
  await reloadRuns()
})
</script>

<style scoped lang="scss">
.evaluation-center {
  padding: 20px 24px;
  background: #f8fafc;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;

  .page-title {
    font-size: 22px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 4px;
  }
  .page-subtitle {
    color: #64748b;
    font-size: 13px;
    margin: 0;
  }
}

.main-tabs {
  background: #fff;
  border-radius: 8px;
  padding: 8px 20px 20px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.tab-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0 12px;
  flex-wrap: wrap;

  .toolbar-search { width: 240px; }
  .toolbar-filter { width: 170px; }
  .toolbar-date { width: 380px; }

  .toolbar-right {
    margin-left: auto;
    display: flex;
    gap: 8px;
  }
}

.dataset-name-cell {
  cursor: pointer;

  .dataset-name {
    display: block;
    color: #2563eb;
    font-weight: 500;
  }
  .dataset-desc {
    display: block;
    color: #64748b;
    font-size: 12px;
    margin-top: 2px;
  }
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.muted-text { color: #94a3b8; font-size: 13px; }
.small { font-size: 12px; }
.dot { color: #cbd5e1; margin: 0 6px; }

.metric-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-variant-numeric: tabular-nums;
}

.progress-text { color: #475569; font-size: 13px; }

.last-run-at {
  font-size: 12px;
  color: #64748b;
  line-height: 18px;
}

.dataset-detail {
  .detail-meta {
    color: #64748b;
    font-size: 13px;
    margin-bottom: 12px;
  }
  .detail-toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    .import-upload { display: inline-block; }
  }
  .doc-tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .tag-gap { margin-right: 4px; }
}

.run-alert { margin-bottom: 16px; }

.run-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}

.run-section {
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;

  .run-section-title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: #334155;
  }
}

.field-hint {
  margin-left: 8px;
  color: #94a3b8;
  font-size: 12px;
}

.full-width { width: 100%; }
</style>
