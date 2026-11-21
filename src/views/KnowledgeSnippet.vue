<template>
  <div class="knowledge-snippet">
    <aside class="doc-panel">
      <div class="doc-panel-search">
        <el-input
          v-model="docKeyword"
          placeholder="搜索文档"
          :prefix-icon="Search"
          clearable
        />
      </div>

      <div v-loading="docLoading" class="doc-list">
        <div v-if="filteredDocs.length === 0 && !docLoading" class="doc-empty">
          <el-empty description="暂无文档" :image-size="60" />
        </div>

        <div
          v-for="doc in filteredDocs"
          :key="doc.id"
          class="doc-item"
          :class="{ active: doc.id === currentDocId }"
          @click="selectDocument(doc)"
        >
          <div class="doc-name" :title="doc.fileName">{{ doc.fileName }}</div>
          <div class="doc-meta">
            <span>{{ doc.chunkCount }} 片段</span>
            <el-tag :type="parseStatusTagType(doc)" size="small">
              {{ parseStatusText(doc) }}
            </el-tag>
          </div>
        </div>
      </div>
    </aside>

    <section class="chunk-panel">
      <div v-if="!currentDocId" class="panel-empty">
        <el-empty description="请在左侧选择文档以查看其片段" />
      </div>

      <template v-else>
        <div class="chunk-info">
          <div class="chunk-info-title">
            <span class="file-name">{{ chunkList.fileName || '文档片段' }}</span>
            <span class="stat">共 {{ chunkList.totalChunks }} 片段</span>
            <span class="stat enabled"><i class="dot" />已启用 {{ enabledCount }}</span>
            <span class="stat disabled"><i class="dot" />已禁用 {{ disabledCount }}</span>
          </div>
          <el-button text :loading="chunkLoading" @click="loadChunks">
            <el-icon :size="14"><Refresh /></el-icon>
            <span>刷新</span>
          </el-button>
        </div>

        <div class="chunk-toolbar">
          <div class="chunk-toolbar-left">
            <span v-if="selectedChunks.length" class="selected-hint">
              已选 {{ selectedChunks.length }} 个
            </span>
            <el-button
              size="small"
              :disabled="!canMerge"
              :loading="batchLoading"
              @click="handleMerge"
            >
              合并所选
            </el-button>
            <el-button
              size="small"
              :disabled="!canEdit || selectedChunks.length === 0"
              :loading="batchLoading"
              @click="batchSetEnabled(true)"
            >
              批量启用
            </el-button>
            <el-button
              size="small"
              :disabled="!canEdit || selectedChunks.length === 0"
              :loading="batchLoading"
              @click="batchSetEnabled(false)"
            >
              批量禁用
            </el-button>
          </div>

          <el-input
            v-model="chunkKeyword"
            class="chunk-search"
            placeholder="搜索片段内容..."
            :prefix-icon="Search"
            clearable
          />
        </div>

        <div v-if="chunkError" class="chunk-error">
          <el-icon :size="20" color="var(--el-color-danger)"><WarningFilled /></el-icon>
          <span>{{ chunkError }}</span>
          <el-button size="small" @click="loadChunks">重新加载</el-button>
        </div>

        <div v-else class="chunk-table">
          <el-table
            :data="filteredChunks"
            row-key="id"
            height="100%"
            v-loading="chunkLoading"
            :header-cell-style="headerCellStyle"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="46" :selectable="isSelectable" />

            <el-table-column label="#" width="56" align="center">
              <template #default="{ row }">
                <span class="chunk-index">{{ row.index }}</span>
              </template>
            </el-table-column>

            <el-table-column label="上下文路径" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="context-prefix" :class="{ 'is-dim': !row.enabled }">
                  {{ row.contextPrefix || '（无上下文）' }}
                </span>
              </template>
            </el-table-column>

            <el-table-column label="类型" width="80" align="center">
              <template #default="{ row }">
                <span class="content-type" :class="contentTypeClass(row)">
                  {{ contentTypeLabel(row) }}
                </span>
              </template>
            </el-table-column>

            <el-table-column label="文本预览" min-width="320">
              <template #default="{ row }">
                <div class="text-preview" :class="{ 'is-dim': !row.enabled }">
                  <template v-for="(seg, i) in splitHighlight(row.text)" :key="i">
                    <mark v-if="seg.match" class="highlight">{{ seg.text }}</mark>
                    <template v-else>{{ seg.text }}</template>
                  </template>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="Tokens" width="90" align="right">
              <template #default="{ row }">
                <span class="token-count">{{ row.tokenCount }}</span>
              </template>
            </el-table-column>

            <el-table-column label="启用" width="80" align="center">
              <template #default="{ row }">
                <el-switch
                  :model-value="row.enabled"
                  :disabled="!canEdit"
                  @change="(val) => handleToggleEnabled(row, !!val)"
                />
              </template>
            </el-table-column>

            <el-table-column label="向量化状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="chunkVectorStatusTag(row)" size="small">
                  {{ chunkVectorStatusText(row) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="240" align="center" fixed="right">
              <template #default="{ row }">
                <div class="action-btns">
                  <el-button link type="primary" size="small" :disabled="!canEdit" @click="openEdit(row)">
                    编辑
                  </el-button>
                  <el-button link type="warning" size="small" :disabled="!canEdit" @click="openSplit(row)">
                    拆分
                  </el-button>
                  <el-button
                    link
                    type="success"
                    size="small"
                    :disabled="!canRevectorize(row)"
                    @click="handleRevectorize(row)"
                  >
                    向量化
                  </el-button>
                  <el-button link type="danger" size="small" :disabled="!canEdit" @click="handleDelete(row)">
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>

            <template #empty>
              <el-empty
                :description="chunkKeyword.trim() ? '未找到匹配的片段' : '暂无已保存片段，请先在知识管理中完成切片'"
                :image-size="80"
              />
            </template>
          </el-table>
        </div>
      </template>
    </section>

    <ChunkEditDialog v-model="editVisible" :chunk="editingChunk" @saved="loadChunks" />
    <ChunkSplitDialog
      v-model="splitVisible"
      :document-id="currentDocId"
      :chunk="splittingChunk"
      @saved="loadChunks"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, WarningFilled } from '@element-plus/icons-vue'
import { knowledgeManagementApi } from '@/api/knowledge-management'
import { chunkApi } from '@/api/knowledge-chunk'
import ChunkEditDialog from '@/components/chunk/ChunkEditDialog.vue'
import ChunkSplitDialog from '@/components/chunk/ChunkSplitDialog.vue'
import { useUserStore } from '@/stores/user'
import type { KnowledgeDocument } from '@/types/knowledge-management'
import type { ChunkListResponse, SavedChunkItem } from '@/types/knowledge-chunk'

const userStore = useUserStore()

const route = useRoute()

const headerCellStyle = {
  background: '#f8fafc',
  color: '#475569',
  fontWeight: 600,
  fontSize: '13px',
  borderBottom: '1px solid #e2e8f0'
}

const EDITOR_ROLES = ['OWNER', 'ADMIN', 'EDITOR']

const canEdit = computed(() => {
  const role = (userStore.user?.role || '').toUpperCase()
  if (!role) return true
  return EDITOR_ROLES.includes(role)
})

const docLoading = ref(false)
const docs = ref<KnowledgeDocument[]>([])
const docKeyword = ref('')
const currentDocId = ref(0)

const chunkLoading = ref(false)
const chunkError = ref('')
const batchLoading = ref(false)
const selectedChunks = ref<SavedChunkItem[]>([])
const chunkKeyword = ref('')

const chunkList = reactive<ChunkListResponse>({
  documentId: 0,
  fileName: '',
  totalChunks: 0,
  chunks: []
})

const editVisible = ref(false)
const editingChunk = ref<SavedChunkItem | null>(null)
const splitVisible = ref(false)
const splittingChunk = ref<SavedChunkItem | null>(null)

const parseStatusMap: Record<number, string> = {
  0: 'unparsed',
  1: 'parsing',
  2: 'parsed',
  3: 'failed'
}

const normalizeParseStatus = (doc: KnowledgeDocument): string => {
  return doc.parseStatus || parseStatusMap[doc.status] || 'unparsed'
}

const parseStatusText = (doc: KnowledgeDocument): string => {
  const status = normalizeParseStatus(doc)
  if (status === 'parsed') return '已完成'
  if (status === 'parsing') return '解析中'
  if (status === 'failed') return '失败'
  return '待处理'
}

const parseStatusTagType = (doc: KnowledgeDocument) => {
  const status = normalizeParseStatus(doc)
  if (status === 'parsed') return 'success'
  if (status === 'parsing') return 'warning'
  if (status === 'failed') return 'danger'
  return 'info'
}

const VECTOR_STATUS_TEXT: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  failed: '失败'
}

const VECTOR_STATUS_TAG: Record<string, 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'info',
  processing: 'warning',
  completed: 'success',
  failed: 'danger'
}

const VECTOR_STATUS_BY_CODE = ['pending', 'processing', 'completed', 'failed']

const chunkVectorStatus = (row: SavedChunkItem): string => {
  return row.vectorStatusText || VECTOR_STATUS_BY_CODE[row.vectorStatus] || 'pending'
}

const chunkVectorStatusText = (row: SavedChunkItem): string => {
  return VECTOR_STATUS_TEXT[chunkVectorStatus(row)] || chunkVectorStatus(row)
}

const chunkVectorStatusTag = (row: SavedChunkItem) => {
  return VECTOR_STATUS_TAG[chunkVectorStatus(row)] || 'info'
}

const filteredDocs = computed(() => {
  const keyword = docKeyword.value.trim().toLowerCase()
  if (!keyword) return docs.value
  return docs.value.filter((doc) => {
    const name = (doc.fileName || '').toLowerCase()
    const title = (doc.title || '').toLowerCase()
    return name.includes(keyword) || title.includes(keyword)
  })
})

const enabledCount = computed(() => chunkList.chunks.filter((c) => c.enabled).length)
const disabledCount = computed(() => chunkList.chunks.filter((c) => !c.enabled).length)

const filteredChunks = computed(() => {
  const keyword = chunkKeyword.value.trim().toLowerCase()
  if (!keyword) return chunkList.chunks
  return chunkList.chunks.filter((chunk) => chunk.text.toLowerCase().includes(keyword))
})

const splitHighlight = (text: string): { text: string; match: boolean }[] => {
  const keyword = chunkKeyword.value.trim()
  if (!keyword || !text) return [{ text, match: false }]

  const segments: { text: string; match: boolean }[] = []
  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  let start = 0
  let index = lowerText.indexOf(lowerKeyword)

  while (index !== -1) {
    if (index > start) {
      segments.push({ text: text.slice(start, index), match: false })
    }
    segments.push({ text: text.slice(index, index + keyword.length), match: true })
    start = index + keyword.length
    index = lowerText.indexOf(lowerKeyword, start)
  }

  if (start < text.length) {
    segments.push({ text: text.slice(start), match: false })
  }

  return segments
}

const contentTypeLabel = (row: SavedChunkItem): string => {
  return row.metadata?.content_type || 'text'
}

const contentTypeClass = (row: SavedChunkItem): string => {
  const type = row.metadata?.content_type
  if (type === 'code') return 'code'
  if (type === 'table') return 'table'
  return 'text'
}

const isContiguous = (rows: SavedChunkItem[]): boolean => {
  const indexes = rows.map((r) => r.index).sort((a, b) => a - b)
  for (let i = 1; i < indexes.length; i++) {
    if (indexes[i] !== indexes[i - 1] + 1) return false
  }
  return true
}

const isSelectable = (): boolean => canEdit.value

const canMerge = computed(
  () => canEdit.value && selectedChunks.value.length >= 2
)

const loadDocuments = async () => {
  docLoading.value = true
  try {
    const result = await knowledgeManagementApi.getList({ pageNum: 1, pageSize: 100 })
    docs.value = result.records || []
    const targetId = Number(route.query.documentId)
    const target = targetId ? docs.value.find((d) => d.id === targetId) : undefined
    if (target) {
      selectDocument(target)
    } else if (!currentDocId.value && docs.value.length) {
      const first = docs.value.find((d) => normalizeParseStatus(d) === 'parsed') || docs.value[0]
      selectDocument(first)
    }
  } catch {
    docs.value = []
  } finally {
    docLoading.value = false
  }
}

const selectDocument = (doc: KnowledgeDocument) => {
  if (doc.id === currentDocId.value) return
  currentDocId.value = doc.id
  loadChunks()
}

const loadChunks = async () => {
  if (!currentDocId.value) return

  chunkLoading.value = true
  chunkError.value = ''
  try {
    const data = await chunkApi.getList(currentDocId.value)
    chunkList.documentId = data.documentId
    chunkList.fileName = data.fileName
    chunkList.totalChunks = data.totalChunks
    chunkList.chunks = data.chunks
    selectedChunks.value = []
  } catch (err: any) {
    chunkList.chunks = []
    selectedChunks.value = []
    chunkError.value = err?.message || '加载片段失败'
  } finally {
    chunkLoading.value = false
  }
}

const handleSelectionChange = (selection: SavedChunkItem[]) => {
  selectedChunks.value = selection
}

const handleToggleEnabled = async (row: SavedChunkItem, enabled: boolean) => {
  try {
    await ElMessageBox.confirm(
      enabled
        ? '确定启用该片段？启用后 AI 检索将重新引用此内容。'
        : '确定禁用该片段？禁用后 AI 检索将不再引用此内容。',
      enabled ? '启用确认' : '禁用确认',
      {
        type: 'warning',
        confirmButtonText: enabled ? '确定启用' : '确定禁用',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  try {
    await chunkApi.setEnabled({ chunkIds: [row.id], enabled })
    row.enabled = enabled
    ElMessage.success(enabled ? '片段已启用，AI 检索时将重新引用此内容' : '片段已禁用，AI 将不再引用此内容')
  } catch {
    // 错误提示已由请求拦截器统一处理
  }
}

const batchSetEnabled = async (enabled: boolean) => {
  if (selectedChunks.value.length === 0) return

  const chunkIds = selectedChunks.value.map((c) => c.id)
  batchLoading.value = true
  try {
    await chunkApi.setEnabled({ chunkIds, enabled })
    ElMessage.success(enabled ? '批量启用成功' : '批量禁用成功')
    await loadChunks()
  } catch {
    // 错误提示已由请求拦截器统一处理
  } finally {
    batchLoading.value = false
  }
}

const handleMerge = async () => {
  if (selectedChunks.value.length < 2) {
    ElMessage.warning('请至少选择 2 个片段进行合并')
    return
  }
  if (!isContiguous(selectedChunks.value)) {
    ElMessage.warning('仅支持合并相邻片段')
    return
  }

  const chunkIds = [...selectedChunks.value]
    .sort((a, b) => a.index - b.index)
    .map((c) => c.id)

  try {
    await ElMessageBox.confirm(
      `将合并 ${chunkIds.length} 个片段为 1 个，按当前顺序以换行拼接，确定继续吗？`,
      '合并确认',
      {
        type: 'warning',
        confirmButtonText: '确定合并',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  batchLoading.value = true
  try {
    await chunkApi.merge({ documentId: currentDocId.value, chunkIds })
    ElMessage.success('合并成功')
    await loadChunks()
  } catch {
    // 错误提示已由请求拦截器统一处理
  } finally {
    batchLoading.value = false
  }
}

const openEdit = (row: SavedChunkItem) => {
  editingChunk.value = row
  editVisible.value = true
}

const openSplit = (row: SavedChunkItem) => {
  splittingChunk.value = row
  splitVisible.value = true
}

const canRevectorize = (row: SavedChunkItem): boolean => {
  return canEdit.value && chunkVectorStatus(row) !== 'processing'
}

const handleRevectorize = async (row: SavedChunkItem) => {
  try {
    await chunkApi.revectorize(row.id)
    row.vectorStatusText = 'processing'
    ElMessage.success('片段已提交重新向量化，后台处理中...')
  } catch {
    // 错误提示已由请求拦截器统一处理
  }
}

const handleDelete = async (row: SavedChunkItem) => {
  try {
    await ElMessageBox.confirm(
      '确定删除该片段？删除后将同步清理索引与向量数据，并重排剩余片段。',
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  try {
    await chunkApi.remove(row.id)
    ElMessage.success('片段已删除')
    await loadChunks()
  } catch {
    // 错误提示已由请求拦截器统一处理
  }
}

onMounted(() => {
  loadDocuments()
})
</script>

<style scoped lang="scss">
.knowledge-snippet {
  display: flex;
  height: 100%;
  gap: 16px;
}

.doc-panel {
  width: 280px;
  min-width: 280px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.doc-panel-search {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.doc-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.doc-empty {
  display: flex;
  justify-content: center;
  padding: 32px 0;
}

.doc-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background 0.15s;

  &:hover {
    background: #f8fafc;
  }

  &.active {
    background: rgba(99, 102, 241, 0.1);
  }
}

.doc-name {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
  color: #94a3b8;
}

.chunk-panel {
  flex: 1;
  min-width: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chunk-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.chunk-info-title {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.file-name {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }

  &.enabled {
    color: #16a34a;

    .dot {
      background: #22c55e;
    }
  }

  &.disabled {
    color: #ef4444;

    .dot {
      background: #ef4444;
    }
  }
}

.chunk-toolbar {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.chunk-toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chunk-search {
  width: 240px;
  margin-left: auto;
}

.selected-hint {
  font-size: 13px;
  color: #6366f1;
}

.chunk-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  color: var(--el-color-danger);
  font-size: 14px;
}

.chunk-table {
  flex: 1;
  min-height: 0;

  :deep(.el-table) {
    --el-table-border-color: #e2e8f0;
  }

  :deep(.el-table th) {
    border-right: none;
  }

  :deep(.el-table td) {
    border-right: none;
  }
}

.chunk-index {
  font-weight: 700;
  font-size: 13px;
  color: #6366f1;
}

.context-prefix {
  font-size: 12px;
  color: #94a3b8;
}

.text-preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13px;
  color: #475569;
  line-height: 1.6;
  word-break: break-word;
}

.highlight {
  background: #fef08a;
  color: #854d0e;
  border-radius: 2px;
  padding: 0 2px;
  font-weight: 600;
}

.token-count {
  font-size: 12px;
  color: #a78bfa;
}

.is-dim {
  color: #cbd5e1;
}

.content-type {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;

  &.text {
    background: #eff6ff;
    color: #2563eb;
  }

  &.code {
    background: #f5f3ff;
    color: #7c3aed;
  }

  &.table {
    background: #fffbeb;
    color: #d97706;
  }
}

.action-btns {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
</style>