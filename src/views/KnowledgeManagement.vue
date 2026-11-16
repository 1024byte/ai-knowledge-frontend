<template>
  <div class="knowledge-management">
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="query.fileName"
          placeholder="请输入文件名"
          :prefix-icon="Search"
          clearable
          class="search-input"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="query.kbId"
          placeholder="请选择知识库"
          clearable
          class="toolbar-select"
          @change="handleSearch"
        >
          <el-option
            v-for="kb in knowledgeBases"
            :key="kb.id"
            :label="kb.name"
            :value="kb.id"
          />
        </el-select>
        <el-select
          v-model="query.status"
          placeholder="解析状态"
          clearable
          class="toolbar-select"
          @change="handleSearch"
        >
          <el-option label="待处理" :value="0" />
          <el-option label="处理中" :value="1" />
          <el-option label="已完成" :value="2" />
          <el-option label="失败" :value="3" />
        </el-select>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" @click="handleUpload">
          <el-icon :size="16"><Upload /></el-icon>
          <span>上传文档</span>
        </el-button>
        <el-button
          plain
          :disabled="selectedIds.length === 0"
          :loading="batchChunking"
          class="auto-chunk-btn"
          @click="handleBatchAutoChunk"
        >
          <el-icon :size="16"><Scissor /></el-icon>
          <span>快速切片</span>
        </el-button>
        <el-button
          plain
          :disabled="selectedIds.length === 0"
          class="batch-delete-btn"
          @click="handleBatchDelete"
        >
          <el-icon :size="16"><Delete /></el-icon>
          <span>批量删除</span>
        </el-button>
      </div>
    </div>

    <div class="table-wrapper">
      <el-table
        ref="tableRef"
        :data="tableData"
        style="width: 100%"
        @selection-change="handleSelectionChange"
        v-loading="loading"
        stripe
        :header-cell-style="headerCellStyle"
      >
        <el-table-column type="selection" width="50" fixed="left" />

        <el-table-column prop="title" label="文档标题" min-width="180" show-overflow-tooltip />

        <el-table-column prop="fileName" label="文件名" min-width="200" show-overflow-tooltip />

        <el-table-column label="所属知识库" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getKbName(row.kbId) }}
          </template>
        </el-table-column>

        <el-table-column label="类型" width="80" align="center">
          <template #default="{ row }">
            <div class="type-cell">
              <el-icon :size="16"><component :is="getFileTypeIcon(row.fileExt)" /></el-icon>
              <span>{{ row.fileExt }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="大小" width="100" align="center">
          <template #default="{ row }">
            {{ formatFileSize(row.fileSize) }}
          </template>
        </el-table-column>

        <el-table-column label="解析状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              v-if="row.parseStatus === 'parsed'"
              class="status-tag done"
              size="small"
            >
              已完成
            </el-tag>
            <el-tag
              v-else-if="row.parseStatus === 'parsing'"
              type="warning"
              size="small"
            >
              解析中
            </el-tag>
            <el-tag
              v-else-if="row.parseStatus === 'failed'"
              type="danger"
              size="small"
            >
              失败
            </el-tag>
            <el-tag
              v-else
              type="info"
              size="small"
            >
              待处理
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="向量化状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag
              v-if="row.vectorStatus === 'vectorized'"
              class="status-tag vectorized"
              size="small"
            >
              已向量化
            </el-tag>
            <el-tag
              v-else-if="row.vectorStatus === 'vectorizing'"
              type="warning"
              size="small"
            >
              向量化中
            </el-tag>
            <el-tag
              v-else-if="row.vectorStatus === 'failed'"
              type="danger"
              size="small"
            >
              向量化失败
            </el-tag>
            <el-tag
              v-else-if="row.vectorStatus === 'unvectorized'"
              type="info"
              size="small"
            >
              待向量化
            </el-tag>
            <span v-else class="status-na">—</span>
          </template>
        </el-table-column>

        <el-table-column prop="chunkCount" label="切片数量" width="90" align="center" />

        <el-table-column prop="createdAt" label="创建时间" width="170" align="center" />

        <el-table-column label="操作" width="230" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-btns">
              <el-tooltip :content="parseTooltip(row)" placement="top">
                <span
                  class="action-btn parse-btn"
                  :class="{ 'is-disabled': !canParse(row) }"
                  @click="canParse(row) && handleParse(row)"
                >
                  <el-icon :size="16"><MagicStick /></el-icon>
                </span>
              </el-tooltip>
              <el-tooltip :content="row.parseStatus !== 'parsed' ? '请先完成解析' : '切片管理'" placement="top">
                <span
                  class="action-btn slice-btn"
                  :class="{ 'is-disabled': row.parseStatus !== 'parsed' }"
                  @click="row.parseStatus === 'parsed' && handleSlice(row)"
                >
                  <el-icon :size="16"><Scissor /></el-icon>
                </span>
              </el-tooltip>
              <el-tooltip :content="vectorizeTooltip(row)" placement="top">
                <span
                  class="action-btn vectorize-btn"
                  :class="{ 'is-disabled': !canVectorize(row) }"
                  @click="canVectorize(row) && handleVectorize(row)"
                >
                  <el-icon :size="16"><Connection /></el-icon>
                </span>
              </el-tooltip>
              <el-tooltip :content="editTooltip(row)" placement="top">
                <span
                  class="action-btn edit-btn"
                  :class="{ 'is-disabled': !canEdit(row) }"
                  @click="canEdit(row) && handleEdit(row)"
                >
                  <el-icon :size="16"><Edit /></el-icon>
                </span>
              </el-tooltip>
              <el-tooltip :content="previewTooltip(row)" placement="top">
                <span
                  class="action-btn preview-btn"
                  :class="{ 'is-disabled': !canPreview(row) }"
                  @click="canPreview(row) && handlePreview(row)"
                >
                  <el-icon :size="16"><View /></el-icon>
                </span>
              </el-tooltip>
              <el-tooltip content="下载" placement="top">
                <span class="action-btn download-btn" @click="handleDownload(row)">
                  <el-icon :size="16"><Download /></el-icon>
                </span>
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <span class="action-btn delete-btn" @click="handleDelete(row)">
                  <el-icon :size="16"><Delete /></el-icon>
                </span>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="fetchData"
        @size-change="fetchData"
      />
    </div>

    <el-dialog
      v-model="uploadDialogVisible"
      title="上传文档"
      width="520px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="uploadFormRef"
        :model="uploadForm"
        :rules="uploadFormRules"
        label-width="100px"
        label-position="right"
      >
        <el-form-item label="所属知识库" prop="kbId">
          <el-select
            v-model="uploadForm.kbId"
            placeholder="请选择知识库"
            style="width: 100%"
          >
            <el-option
              v-for="kb in knowledgeBases"
              :key="kb.id"
              :label="kb.name"
              :value="kb.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="文档标题" prop="title">
          <el-input v-model="uploadForm.title" placeholder="请输入文档标题（业务说明）" maxlength="200" show-word-limit />
        </el-form-item>

        <el-form-item label="文档文件" prop="file">
          <div class="file-selector">
            <el-button class="select-file-btn" @click="triggerFileInput">选择文件</el-button>
            <span v-if="uploadForm.fileName" class="file-name">{{ uploadForm.fileName }}</span>
            <span v-else class="file-placeholder">未选择文件</span>
            <input
              ref="fileInputRef"
              type="file"
              style="display: none"
              @change="onDialogFileSelected"
            />
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="uploadDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleUploadSubmit">确定</el-button>
        </div>
      </template>
    </el-dialog>

    <ChunkEditor
      v-model:visible="chunkEditorVisible"
      :document-id="chunkEditorDocumentId"
      :vectorized="chunkEditorVectorized"
      @saved="onChunksSaved"
    />

    <DocumentEdit
      v-model:visible="editVisible"
      :document-id="editDocumentId"
      :chunk-count="editChunkCount"
      @saved="onContentSaved"
    />

    <DocumentPreview
      v-model:visible="previewVisible"
      :document-id="previewDocumentId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  Search,
  Upload,
  Delete,
  MagicStick,
  Scissor,
  Edit,
  View,
  Download,
  Connection,
  Document,
  Picture,
  Files
} from '@element-plus/icons-vue'
import { knowledgeManagementApi } from '@/api/knowledge-management'
import { knowledgeBaseApi } from '@/api/knowledgeBase'
import ChunkEditor from '@/components/document/ChunkEditor.vue'
import DocumentEdit from '@/components/document/DocumentEdit.vue'
import DocumentPreview from '@/components/document/DocumentPreview.vue'
import type { KnowledgeDocument } from '@/types/knowledge-management'
import type { KnowledgeBaseItem } from '@/types/knowledge-base'

const loading = ref(false)
const submitting = ref(false)
const batchChunking = ref(false)
const tableRef = ref()
const fileInputRef = ref<HTMLInputElement>()
const uploadFormRef = ref<FormInstance>()
const uploadDialogVisible = ref(false)
const chunkEditorVisible = ref(false)
const chunkEditorDocumentId = ref(0)
const chunkEditorVectorized = ref(false)
const editVisible = ref(false)
const editDocumentId = ref(0)
const editChunkCount = ref(0)
const previewVisible = ref(false)
const previewDocumentId = ref(0)
const tableData = ref<KnowledgeDocument[]>([])
const selectedIds = ref<number[]>([])
const total = ref(0)
const knowledgeBases = ref<KnowledgeBaseItem[]>([])

const uploadForm = reactive({
  kbId: null as number | null,
  title: '',
  file: null as File | null,
  fileName: ''
})

const uploadFormRules: FormRules = {
  kbId: [
    { required: true, message: '请选择所属知识库', trigger: 'change' }
  ],
  title: [
    { required: true, message: '请输入文档标题', trigger: 'blur' },
    { min: 1, max: 200, message: '标题长度在 1 到 200 个字符', trigger: 'blur' }
  ],
  file: [
    { required: true, message: '请选择文档文件', trigger: 'change' }
  ]
}

const query = reactive({
  fileName: '',
  kbId: undefined as number | undefined,
  status: undefined as number | undefined,
  pageNum: 1,
  pageSize: 10
})

const headerCellStyle = {
  background: '#f8fafc',
  color: '#475569',
  fontWeight: 600,
  fontSize: '13px',
  borderBottom: '1px solid #e2e8f0'
}

const getKbName = (kbId: number): string => {
  const kb = knowledgeBases.value.find((item) => item.id === kbId)
  return kb ? kb.name : `知识库 #${kbId}`
}

const getFileTypeIcon = (fileExt: string) => {
  const ext = fileExt.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) return Picture
  if (['pdf'].includes(ext)) return Document
  return Files
}

const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

const parseStatusMap: Record<number, KnowledgeDocument['parseStatus']> = {
  0: 'unparsed',
  1: 'parsing',
  2: 'parsed',
  3: 'failed'
}

const normalizeDocument = (doc: KnowledgeDocument): KnowledgeDocument => {
  return {
    ...doc,
    parseStatus: doc.parseStatus || parseStatusMap[doc.status] || 'unparsed',
    vectorStatus:
      doc.vectorStatus ||
      (doc.status !== 2
        ? 'unvectorized'
        : doc.isVectorized === 1
          ? 'vectorizing'
          : doc.isVectorized === 2
            ? 'vectorized'
            : doc.isVectorized === 3
              ? 'failed'
              : 'unvectorized')
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const result = await knowledgeManagementApi.getList({
      fileName: query.fileName || undefined,
      kbId: query.kbId,
      status: query.status,
      pageNum: query.pageNum,
      pageSize: query.pageSize
    })
    tableData.value = result.records.map(normalizeDocument)
    total.value = result.total
  } catch {
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const fetchKnowledgeBases = async () => {
  try {
    knowledgeBases.value = await knowledgeBaseApi.getList()
  } catch {
    knowledgeBases.value = []
  }
}

const handleSearch = () => {
  query.pageNum = 1
  fetchData()
}

const handleSelectionChange = (selection: KnowledgeDocument[]) => {
  selectedIds.value = selection.map((item) => item.id)
}

const resetUploadForm = () => {
  uploadForm.kbId = null
  uploadForm.title = ''
  uploadForm.file = null
  uploadForm.fileName = ''
  nextTick(() => {
    uploadFormRef.value?.clearValidate()
  })
}

const handleUpload = () => {
  resetUploadForm()
  uploadDialogVisible.value = true
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const onDialogFileSelected = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  uploadForm.file = file
  uploadForm.fileName = file.name
  if (!uploadForm.title) {
    const dotIndex = file.name.lastIndexOf('.')
    uploadForm.title = dotIndex > 0 ? file.name.substring(0, dotIndex) : file.name
  }
  uploadFormRef.value?.validateField('file')
}

const handleUploadSubmit = async () => {
  const valid = await uploadFormRef.value?.validate().catch(() => false)
  if (!valid) return
  if (!uploadForm.file) return
  if (uploadForm.kbId === null) return

  submitting.value = true
  try {
    const formData = new FormData()
    formData.append('file', uploadForm.file)
    formData.append('kbId', String(uploadForm.kbId))
    formData.append('title', uploadForm.title)

    await knowledgeManagementApi.upload(formData)
    ElMessage.success('上传成功')
    uploadDialogVisible.value = false
    fetchData()
  } catch {
    // 错误提示已由请求拦截器统一处理
  } finally {
    submitting.value = false
  }
}

const canParse = (row: KnowledgeDocument): boolean => {
  return row.parseStatus !== 'parsing' && row.vectorStatus !== 'vectorized'
}

const parseTooltip = (row: KnowledgeDocument): string => {
  if (row.parseStatus === 'parsing') return '解析中...'
  if (row.vectorStatus === 'vectorized') return '已向量化，无法重新解析'
  return '解析'
}

const handleParse = async (row: KnowledgeDocument) => {
  if (row.vectorStatus === 'vectorized') {
    ElMessage.warning('文档已向量化，无法重新解析')
    return
  }

  if (row.status === 2) {
    try {
      await ElMessageBox.confirm(
        '该文档已完成解析，重新解析将清理已有切片并需要手动重新生成，确定继续吗？',
        '重新解析确认',
        { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
      )
    } catch {
      return
    }
  }

  try {
    const result = await knowledgeManagementApi.parse(row.id)
    row.status = result.status
    row.parsedTextUrl = result.parsedTextUrl
    row.errorMessage = result.errorMessage
    row.parseStatus = result.parseStatus
    row.vectorStatus = result.vectorStatus
    ElMessage.success('解析任务已提交，后台处理中...')

    pollParseStatus(row.id)
  } catch {
    // 错误提示已由请求拦截器统一处理
  }
}

const pollTimers = new Set<ReturnType<typeof setTimeout>>()

const schedulePoll = (fn: () => void, delay: number) => {
  const timer = setTimeout(() => {
    pollTimers.delete(timer)
    fn()
  }, delay)
  pollTimers.add(timer)
  return timer
}

const pollParseStatus = async (documentId: number, intervalMs = 3000, timeoutMs = 300000) => {
  const startTime = Date.now()

  const poll = async () => {
    if (Date.now() - startTime > timeoutMs) {
      ElMessage.warning('解析超时，请稍后手动刷新查看结果')
      return
    }

    try {
      const doc = await knowledgeManagementApi.getById(documentId)
      const target = tableData.value.find((item) => item.id === documentId)
      if (target) {
        target.status = doc.status
        target.parsedTextUrl = doc.parsedTextUrl
        target.errorMessage = doc.errorMessage
        target.chunkCount = doc.chunkCount
        target.tokenCount = doc.tokenCount
        target.parseStatus = doc.parseStatus
        target.vectorStatus = doc.vectorStatus
        target.isVectorized = doc.isVectorized
      }

      if (doc.errorMessage) {
        ElMessage.error(`解析失败: ${doc.errorMessage}`)
      } else if (doc.status === 2) {
        ElMessage.success(`文档「${doc.title || doc.fileName}」解析完成`)
      } else if (doc.status === 3) {
        ElMessage.error(`解析失败: ${doc.errorMessage || '未知错误'}`)
      } else {
        schedulePoll(poll, intervalMs)
      }
    } catch {
      schedulePoll(poll, intervalMs)
    }
  }

  schedulePoll(poll, intervalMs)
}

const handleSlice = (row: KnowledgeDocument) => {
  chunkEditorDocumentId.value = row.id
  chunkEditorVectorized.value = row.vectorStatus === 'vectorized'
  chunkEditorVisible.value = true
}

const onChunksSaved = () => {
  fetchData()
}

const canVectorize = (row: KnowledgeDocument): boolean => {
  return (
    row.parseStatus === 'parsed' &&
    row.chunkCount > 0 &&
    (row.vectorStatus === 'unvectorized' || row.vectorStatus === 'failed')
  )
}

const vectorizeTooltip = (row: KnowledgeDocument): string => {
  if (row.parseStatus !== 'parsed') return '请先完成解析'
  if (row.chunkCount === 0) return '请先完成切片'
  if (row.vectorStatus === 'vectorized') return '已向量化'
  if (row.vectorStatus === 'vectorizing') return '向量化中...'
  if (row.vectorStatus === 'failed') return '向量化失败，可重试'
  return '向量化'
}

const handleVectorize = async (row: KnowledgeDocument) => {
  try {
    const result = await knowledgeManagementApi.vectorize(row.id)
    row.isVectorized = result.isVectorized
    row.vectorStatus = result.vectorStatus
    row.parseStatus = result.parseStatus
    row.errorMessage = result.errorMessage
    ElMessage.success('向量化任务已提交，后台处理中...')
    pollVectorizeStatus(row.id)
  } catch {
    // 错误提示已由请求拦截器统一处理
  }
}

const pollVectorizeStatus = async (documentId: number, intervalMs = 3000, timeoutMs = 300000) => {
  const startTime = Date.now()

  const poll = async () => {
    if (Date.now() - startTime > timeoutMs) {
      ElMessage.warning('向量化超时，请稍后手动刷新查看结果')
      return
    }

    try {
      const doc = await knowledgeManagementApi.getById(documentId)
      const target = tableData.value.find((item) => item.id === documentId)
      if (target) {
        target.isVectorized = doc.isVectorized
        target.vectorStatus = doc.vectorStatus
        target.parseStatus = doc.parseStatus
        target.errorMessage = doc.errorMessage
      }

      if (doc.vectorStatus === 'vectorized') {
        ElMessage.success(`文档「${doc.title || doc.fileName}」向量化完成`)
      } else if (doc.vectorStatus === 'failed') {
        ElMessage.error(`向量化失败: ${doc.errorMessage || '未知错误'}`)
      } else {
        schedulePoll(poll, intervalMs)
      }
    } catch {
      schedulePoll(poll, intervalMs)
    }
  }

  schedulePoll(poll, intervalMs)
}

const canEdit = (row: KnowledgeDocument): boolean => {
  return row.parseStatus === 'parsed' && row.vectorStatus !== 'vectorized'
}

const editTooltip = (row: KnowledgeDocument): string => {
  if (row.parseStatus !== 'parsed') return '请先完成解析'
  if (row.vectorStatus === 'vectorized') return '已向量化，无法编辑'
  return '编辑'
}

const handleEdit = (row: KnowledgeDocument) => {
  editDocumentId.value = row.id
  editChunkCount.value = row.chunkCount
  editVisible.value = true
}

const onContentSaved = () => {
  fetchData()
}

const canPreview = (row: KnowledgeDocument): boolean => {
  return row.parseStatus === 'parsed'
}

const previewTooltip = (row: KnowledgeDocument): string => {
  if (row.parseStatus !== 'parsed') return '请先完成解析'
  return '预览'
}

const handlePreview = (row: KnowledgeDocument) => {
  previewDocumentId.value = row.id
  previewVisible.value = true
}

const handleDownload = (row: KnowledgeDocument) => {
  const url = knowledgeManagementApi.download(row.id)
  window.open(url, '_blank')
}

const handleDelete = async (row: KnowledgeDocument) => {
  try {
    await ElMessageBox.confirm(`确定要删除文档「${row.title}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    await knowledgeManagementApi.delete(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch {
    // 取消删除
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 个文档吗？`,
      '批量删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    )
    await knowledgeManagementApi.batchDelete(selectedIds.value)
    ElMessage.success('批量删除成功')
    selectedIds.value = []
    fetchData()
  } catch {
    // 取消删除
  }
}

const handleBatchAutoChunk = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请先选择文档')
    return
  }

  const vectorizedCount = tableData.value.filter(
    (item) => selectedIds.value.includes(item.id) && item.vectorStatus === 'vectorized'
  ).length
  if (vectorizedCount > 0) {
    ElMessage.warning(`选中的文档中有 ${vectorizedCount} 个已向量化，无法重新切片，请先取消选择这些文档`)
    return
  }

  batchChunking.value = true
  try {
    const result = await knowledgeManagementApi.autoChunkBatch(selectedIds.value)
    if (result.failures.length > 0) {
      ElMessage.warning(
        `快速切片完成: ${result.success}/${result.total} 成功，${result.failures.length} 个失败`
      )
    } else {
      ElMessage.success(`快速切片完成: ${result.success}/${result.total} 个文档全部成功`)
    }
    selectedIds.value = []
    fetchData()
  } catch {
    // 错误提示已由请求拦截器统一处理
  } finally {
    batchChunking.value = false
  }
}

const resumeProcessingPolls = () => {
  tableData.value.forEach((item) => {
    if (item.parseStatus === 'parsing') {
      pollParseStatus(item.id)
    } else if (item.vectorStatus === 'vectorizing') {
      pollVectorizeStatus(item.id)
    }
  })
}

onMounted(async () => {
  await fetchData()
  fetchKnowledgeBases()
  resumeProcessingPolls()
})

onUnmounted(() => {
  pollTimers.forEach((timer) => clearTimeout(timer))
  pollTimers.clear()
})
</script>

<style scoped lang="scss">
.knowledge-management {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  width: 240px;
}

.toolbar-select {
  width: 180px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.auto-chunk-btn {
  border-color: #f59e0b;
  color: #f59e0b;

  &:hover {
    background: #fffbeb;
    border-color: #f59e0b;
    color: #d97706;
  }

  &.is-disabled {
    border-color: #fde68a;
    color: #fde68a;
  }
}

.batch-delete-btn {
  border-color: #ef4444;
  color: #ef4444;

  &:hover {
    background: #fef2f2;
    border-color: #ef4444;
    color: #dc2626;
  }

  &.is-disabled {
    border-color: #fca5a5;
    color: #fca5a5;
  }
}

.table-wrapper {
  flex: 1;
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;

  :deep(.el-table) {
    --el-table-border-color: #e2e8f0;
  }

  :deep(.el-table th) {
    border-right: none;
  }

  :deep(.el-table td) {
    border-right: none;
  }

  :deep(.el-table__row:hover > td) {
    background: #f8fafc !important;
  }
}

.type-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 13px;
  color: #64748b;
}

.status-tag {
  &.done {
    background: #f0fdf4;
    border-color: #bbf7d0;
    color: #16a34a;
  }

  &.vectorized {
    background: #ecfdf5;
    border-color: #a7f3d0;
    color: #059669;
  }
}

.status-na {
  color: #cbd5e1;
  font-size: 14px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.action-btns {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #64748b;

  &:hover {
    background: #f1f5f9;
    color: #334155;
  }
}

.parse-btn:hover {
  color: #8b5cf6;
  background: #f5f3ff;
}

.parse-btn.is-disabled {
  cursor: not-allowed;
  opacity: 0.4;
  pointer-events: none;
}

.slice-btn:hover {
  color: #f59e0b;
  background: #fffbeb;
}

.slice-btn.is-disabled {
  cursor: not-allowed;
  opacity: 0.4;
  pointer-events: none;
}

.vectorize-btn:hover {
  color: #06b6d4;
  background: #ecfeff;
}

.vectorize-btn.is-disabled {
  cursor: not-allowed;
  opacity: 0.4;
  pointer-events: none;
}

.download-btn:hover {
  color: #10b981;
  background: #ecfdf5;
}

.preview-btn:hover {
  color: #3b82f6;
  background: #eff6ff;
}

.preview-btn.is-disabled {
  cursor: not-allowed;
  opacity: 0.4;
  pointer-events: none;
}

.edit-btn:hover {
  color: #8b5cf6;
  background: #f5f3ff;
}

.edit-btn.is-disabled {
  cursor: not-allowed;
  opacity: 0.4;
  pointer-events: none;
}

.delete-btn:hover {
  color: #ef4444;
  background: #fef2f2;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.file-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.select-file-btn {
  flex-shrink: 0;
}

.file-name {
  font-size: 13px;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-placeholder {
  font-size: 13px;
  color: #94a3b8;
}
</style>