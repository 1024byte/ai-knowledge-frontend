<template>
  <div class="knowledge-management">
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="query.title"
          placeholder="请输入文档标题"
          :prefix-icon="Search"
          clearable
          class="search-input"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="query.knowledgeBase"
          placeholder="请选择知识库"
          clearable
          class="toolbar-select"
          @change="handleSearch"
        >
          <el-option
            v-for="kb in knowledgeBases"
            :key="kb"
            :label="kb"
            :value="kb"
          />
        </el-select>
        <el-select
          v-model="query.parseStatus"
          placeholder="解析状态"
          clearable
          class="toolbar-select"
          @change="handleSearch"
        >
          <el-option label="已解析" value="parsed" />
          <el-option label="未解析" value="unparsed" />
          <el-option label="解析中" value="parsing" />
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

        <el-table-column prop="title" label="文档标题" min-width="200" show-overflow-tooltip />

        <el-table-column prop="knowledgeBase" label="所属知识库" min-width="140" show-overflow-tooltip />

        <el-table-column prop="fileName" label="文件名" min-width="180" show-overflow-tooltip />

        <el-table-column label="类型" width="80" align="center">
          <template #default="{ row }">
            <div class="type-cell">
              <el-icon :size="16"><component :is="getFileTypeIcon(row.fileType)" /></el-icon>
              <span>{{ row.fileType }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="大小" width="100" align="center">
          <template #default="{ row }">
            {{ formatFileSize(row.fileSize) }}
          </template>
        </el-table-column>

        <el-table-column label="解析状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag
              v-if="row.parseStatus === 'parsed'"
              class="parse-tag parsed"
              size="small"
            >
              已解析
            </el-tag>
            <el-tag
              v-else-if="row.parseStatus === 'parsing'"
              type="warning"
              size="small"
            >
              解析中
            </el-tag>
            <el-tag
              v-else
              type="info"
              size="small"
            >
              未解析
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="向量化状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag
              v-if="row.vectorStatus === 'vectorized'"
              class="vector-tag vectorized"
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
              v-else
              class="vector-tag unvectorized"
              size="small"
            >
              未向量化
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="创建时间" width="170" align="center" />

        <el-table-column label="操作" width="280" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-btns">
              <el-tooltip content="解析" placement="top">
                <span class="action-btn parse-btn" @click="handleParse(row)">
                  <el-icon :size="16"><MagicStick /></el-icon>
                </span>
              </el-tooltip>
              <el-tooltip content="切片" placement="top">
                <span class="action-btn slice-btn" @click="handleSlice(row)">
                  <el-icon :size="16"><Scissor /></el-icon>
                </span>
              </el-tooltip>
              <el-tooltip content="预览" placement="top">
                <span class="action-btn preview-btn" @click="handlePreview(row)">
                  <el-icon :size="16"><View /></el-icon>
                </span>
              </el-tooltip>
              <el-tooltip content="下载" placement="top">
                <span class="action-btn download-btn" @click="handleDownload(row)">
                  <el-icon :size="16"><Download /></el-icon>
                </span>
              </el-tooltip>
              <el-tooltip content="编辑" placement="top">
                <span class="action-btn edit-btn" @click="handleEdit(row)">
                  <el-icon :size="16"><Edit /></el-icon>
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
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="fetchData"
        @size-change="fetchData"
      />
    </div>

    <input
      ref="fileInputRef"
      type="file"
      style="display: none"
      @change="onFileSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Upload,
  Delete,
  MagicStick,
  Scissor,
  View,
  Download,
  Edit,
  Document,
  Picture,
  VideoPlay,
  Files
} from '@element-plus/icons-vue'
import { knowledgeManagementApi } from '@/api/knowledge-management'
import type { KnowledgeDocument } from '@/types/knowledge-management'

const loading = ref(false)
const tableRef = ref()
const fileInputRef = ref<HTMLInputElement>()
const tableData = ref<KnowledgeDocument[]>([])
const selectedIds = ref<number[]>([])
const total = ref(0)
const knowledgeBases = ref<string[]>([])

const query = reactive({
  title: '',
  knowledgeBase: '',
  parseStatus: '',
  page: 1,
  pageSize: 10
})

const headerCellStyle = {
  background: '#f8fafc',
  color: '#475569',
  fontWeight: 600,
  fontSize: '13px',
  borderBottom: '1px solid #e2e8f0'
}

const getFileTypeIcon = (fileType: string) => {
  const type = fileType.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(type)) return Picture
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(type)) return VideoPlay
  if (type === 'pdf') return Document
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

const fetchData = async () => {
  loading.value = true
  try {
    const result = await knowledgeManagementApi.getList({
      title: query.title || undefined,
      knowledgeBase: query.knowledgeBase || undefined,
      parseStatus: query.parseStatus || undefined,
      page: query.page,
      pageSize: query.pageSize
    })
    tableData.value = result.list
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
    knowledgeBases.value = await knowledgeManagementApi.getKnowledgeBases()
  } catch {
    knowledgeBases.value = []
  }
}

const handleSearch = () => {
  query.page = 1
  fetchData()
}

const handleSelectionChange = (selection: KnowledgeDocument[]) => {
  selectedIds.value = selection.map((item) => item.id)
}

const handleUpload = () => {
  fileInputRef.value?.click()
}

const onFileSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)

  try {
    await knowledgeManagementApi.upload(formData)
    ElMessage.success('上传成功')
    fetchData()
  } catch {
    ElMessage.error('上传失败')
  } finally {
    target.value = ''
  }
}

const handleParse = async (row: KnowledgeDocument) => {
  try {
    await knowledgeManagementApi.parse(row.id)
    ElMessage.success('解析任务已提交')
    fetchData()
  } catch {
    ElMessage.error('解析失败')
  }
}

const handleSlice = async (row: KnowledgeDocument) => {
  try {
    await knowledgeManagementApi.slice(row.id)
    ElMessage.success('切片任务已提交')
    fetchData()
  } catch {
    ElMessage.error('切片失败')
  }
}

const handlePreview = (row: KnowledgeDocument) => {
  ElMessage.info(`预览文档: ${row.title}`)
}

const handleDownload = (row: KnowledgeDocument) => {
  const url = knowledgeManagementApi.download(row.id)
  window.open(url, '_blank')
}

const handleEdit = (row: KnowledgeDocument) => {
  ElMessage.info(`编辑文档: ${row.title}`)
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

onMounted(() => {
  fetchData()
  fetchKnowledgeBases()
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

.parse-tag {
  &.parsed {
    background: #ecfdf5;
    color: #059669;
    border-color: #a7f3d0;
  }
}

.vector-tag {
  &.vectorized {
    background: #ecfdf5;
    color: #059669;
    border-color: #a7f3d0;
  }

  &.unvectorized {
    background: #f1f5f9;
    color: #94a3b8;
    border-color: #e2e8f0;
  }
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
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;

  .el-icon {
    color: #ffffff;
  }

  &.parse-btn {
    background: #f97316;

    &:hover {
      background: #ea580c;
    }
  }

  &.slice-btn {
    background: #3b82f6;

    &:hover {
      background: #2563eb;
    }
  }

  &.preview-btn {
    background: #94a3b8;

    &:hover {
      background: #64748b;
    }
  }

  &.download-btn {
    background: #22c55e;

    &:hover {
      background: #16a34a;
    }
  }

  &.edit-btn {
    background: #3b82f6;

    &:hover {
      background: #2563eb;
    }
  }

  &.delete-btn {
    background: #ef4444;

    &:hover {
      background: #dc2626;
    }
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding: 0 4px;
}
</style>