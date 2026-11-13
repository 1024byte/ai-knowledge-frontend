<template>
  <div class="knowledge-base-management">
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchName"
          placeholder="请输入知识库名称"
          :prefix-icon="Search"
          clearable
          class="search-input"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="searchStatus"
          placeholder="状态"
          clearable
          class="toolbar-select"
          @change="handleSearch"
        >
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
      </div>
      <div class="toolbar-right">
        <el-button class="add-btn" @click="handleAdd">
          <el-icon :size="16"><Plus /></el-icon>
          <span>新增</span>
        </el-button>
        <el-button
          class="batch-delete-btn"
          :disabled="selectedIds.length === 0"
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
        v-loading="loading"
        style="width: 100%"
        @selection-change="handleSelectionChange"
        :header-cell-style="headerCellStyle"
      >
        <el-table-column type="selection" width="50" fixed="left" />

        <el-table-column prop="name" label="知识库名称" min-width="180" show-overflow-tooltip />

        <el-table-column prop="description" label="说明" min-width="260" show-overflow-tooltip />

        <el-table-column prop="chunkLength" label="切片长度" width="110" align="center" />

        <el-table-column prop="overlapLength" label="重叠长度" width="110" align="center" />

        <el-table-column label="切片策略" width="130" align="center">
          <template #default="{ row }">
            {{ splitStrategyMap[row.splitStrategy] || row.splitStrategy }}
          </template>
        </el-table-column>

        <el-table-column prop="embeddingModel" label="向量模型" min-width="180" show-overflow-tooltip />

        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <span :class="['status-tag', row.status === 1 ? 'status-on' : 'status-off']">
              {{ row.status === 1 ? '启用' : '停用' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="创建时间" width="180" align="center" />

        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-btns">
              <el-tooltip content="成员管理" placement="top">
                <span class="action-btn member-btn" @click="handleManageMembers(row)">
                  <el-icon :size="16"><UserFilled /></el-icon>
                </span>
              </el-tooltip>
              <span class="action-btn edit-btn" @click="handleEdit(row)">
                <el-icon :size="16"><Edit /></el-icon>
              </span>
              <span class="action-btn delete-btn" @click="handleDelete(row)">
                <el-icon :size="16"><Delete /></el-icon>
              </span>
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

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑知识库' : '新增知识库'"
      width="560px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="110px"
        label-position="right"
      >
        <el-form-item label="知识库名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入知识库名称" maxlength="50" show-word-limit />
        </el-form-item>

        <el-form-item label="说明" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入知识库说明"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="切片长度" prop="chunkLength">
          <el-input-number
            v-model="formData.chunkLength"
            :min="100"
            :max="2000"
            :step="10"
            placeholder="切片长度"
          />
          <span class="form-tip">字符数，建议 300 ~ 800</span>
        </el-form-item>

        <el-form-item label="重叠长度" prop="overlapLength">
          <el-input-number
            v-model="formData.overlapLength"
            :min="0"
            :max="500"
            :step="10"
            placeholder="重叠长度"
          />
          <span class="form-tip">字符数，建议为切片长度的 10%~20%</span>
        </el-form-item>

        <el-divider content-position="left">高级配置</el-divider>

        <el-form-item label="切片策略" prop="splitStrategy">
          <el-select v-model="formData.splitStrategy" placeholder="请选择切片策略">
            <el-option label="递归字符分割" value="RECURSIVE" />
            <el-option label="按句子分割" value="SENTENCE" />
            <el-option label="按段落分割" value="PARAGRAPH" />
            <el-option label="按行分割" value="LINE" />
          </el-select>
        </el-form-item>

        <el-form-item label="向量模型" prop="embeddingModel">
          <el-input v-model="formData.embeddingModel" placeholder="请输入向量模型名称" />
        </el-form-item>

        <el-form-item label="检索返回数量" prop="retrievalTopK">
          <el-input-number
            v-model="formData.retrievalTopK"
            :min="1"
            :max="50"
            :step="1"
            placeholder="检索返回数量"
          />
          <span class="form-tip">RAG 检索时返回的最大片段数</span>
        </el-form-item>

        <el-form-item label="相似度阈值" prop="similarityThreshold">
          <el-input-number
            v-model="formData.similarityThreshold"
            :min="0"
            :max="1"
            :step="0.01"
            :precision="2"
            placeholder="相似度阈值"
          />
          <span class="form-tip">取值范围 0.00 ~ 1.00，默认 0.70</span>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ isEdit ? '保存修改' : '确认新增' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, Plus, Edit, Delete, UserFilled } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { knowledgeBaseApi } from '@/api/knowledgeBase'
import type { KnowledgeBaseItem, KnowledgeBaseCreateRequest, KnowledgeBaseUpdateRequest } from '@/types/knowledge-base'

const router = useRouter()

const searchName = ref('')
const searchStatus = ref<number | ''>('')
const selectedIds = ref<number[]>([])
const tableRef = ref()
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const loading = ref(false)
const formRef = ref<FormInstance>()
let editId: number | null = null

const formData = reactive({
  name: '',
  description: '',
  chunkLength: 500,
  overlapLength: 80,
  splitStrategy: 'RECURSIVE',
  embeddingModel: 'text-embedding-3-small',
  retrievalTopK: 5,
  similarityThreshold: 0.7
})

const splitStrategyMap: Record<string, string> = {
  RECURSIVE: '递归字符分割',
  SENTENCE: '按句子分割',
  PARAGRAPH: '按段落分割',
  LINE: '按行分割'
}

const formRules: FormRules = {
  name: [
    { required: true, message: '请输入知识库名称', trigger: 'blur' },
    { min: 1, max: 50, message: '名称长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  description: [
    { max: 200, message: '说明不超过 200 个字符', trigger: 'blur' }
  ],
  chunkLength: [
    { required: true, message: '请输入切片长度', trigger: 'blur' },
    { type: 'number', min: 100, max: 2000, message: '切片长度在 100 ~ 2000', trigger: 'blur' }
  ],
  overlapLength: [
    { required: true, message: '请输入重叠长度', trigger: 'blur' },
    { type: 'number', min: 0, max: 500, message: '重叠长度在 0 ~ 500', trigger: 'blur' }
  ],
  similarityThreshold: [
    { type: 'number', min: 0, max: 1, message: '相似度阈值在 0.00 ~ 1.00', trigger: 'blur' }
  ]
}

const query = reactive({
  page: 1,
  pageSize: 10
})

const total = ref(0)
const allData = ref<KnowledgeBaseItem[]>([])
const tableData = ref<KnowledgeBaseItem[]>([])

const headerCellStyle = {
  background: '#f8fafc',
  color: '#64748b',
  fontWeight: '600',
  fontSize: '13px',
  borderBottom: '2px solid #e2e8f0'
}

const fetchData = async () => {
  loading.value = true
  try {
    allData.value = await knowledgeBaseApi.getList()
  } catch {
    allData.value = []
    // 错误提示已由请求拦截器统一处理
  } finally {
    loading.value = false
  }

  let data = [...allData.value]

  if (searchName.value) {
    data = data.filter((item) => item.name.includes(searchName.value))
  }
  if (searchStatus.value !== '') {
    data = data.filter((item) => item.status === searchStatus.value)
  }

  total.value = data.length

  const start = (query.page - 1) * query.pageSize
  tableData.value = data.slice(start, start + query.pageSize)
}

const handleSearch = () => {
  query.page = 1
  fetchData()
}

const handleSelectionChange = (selection: KnowledgeBaseItem[]) => {
  selectedIds.value = selection.map((item) => item.id)
}

const resetForm = () => {
  formData.name = ''
  formData.description = ''
  formData.chunkLength = 500
  formData.overlapLength = 80
  formData.splitStrategy = 'RECURSIVE'
  formData.embeddingModel = 'text-embedding-3-small'
  formData.retrievalTopK = 5
  formData.similarityThreshold = 0.7
  editId = null
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

const handleAdd = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row: KnowledgeBaseItem) => {
  isEdit.value = true
  editId = row.id
  formData.name = row.name
  formData.description = row.description
  formData.chunkLength = row.chunkLength
  formData.overlapLength = row.overlapLength
  formData.splitStrategy = row.splitStrategy
  formData.embeddingModel = row.embeddingModel
  formData.retrievalTopK = row.retrievalTopK
  formData.similarityThreshold = row.similarityThreshold
  dialogVisible.value = true
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isEdit.value && editId !== null) {
      const updateData: KnowledgeBaseUpdateRequest = {
        name: formData.name,
        description: formData.description,
        chunkLength: formData.chunkLength,
        overlapLength: formData.overlapLength,
        splitStrategy: formData.splitStrategy,
        embeddingModel: formData.embeddingModel,
        retrievalTopK: formData.retrievalTopK,
        similarityThreshold: formData.similarityThreshold
      }
      await knowledgeBaseApi.update(editId, updateData)
      ElMessage.success('知识库修改成功')
    } else {
      const createData: KnowledgeBaseCreateRequest = {
        name: formData.name,
        description: formData.description,
        chunkLength: formData.chunkLength,
        overlapLength: formData.overlapLength,
        splitStrategy: formData.splitStrategy,
        embeddingModel: formData.embeddingModel,
        retrievalTopK: formData.retrievalTopK,
        similarityThreshold: formData.similarityThreshold
      }
      await knowledgeBaseApi.create(createData)
      ElMessage.success('知识库新增成功')
    }

    dialogVisible.value = false
    fetchData()
  } catch {
    // 错误提示已由请求拦截器统一处理
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (row: KnowledgeBaseItem) => {
  try {
    await ElMessageBox.confirm(`确定要删除知识库「${row.name}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    await knowledgeBaseApi.delete(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch {
    // 取消删除
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 个知识库吗？`,
      '批量删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    )
    const results = await Promise.allSettled(
      selectedIds.value.map((id) => knowledgeBaseApi.delete(id))
    )
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      ElMessage.warning(`删除完成，${failed} 个失败`)
    } else {
      ElMessage.success('批量删除成功')
    }
    selectedIds.value = []
    fetchData()
  } catch {
    // 取消删除
  }
}

const handleManageMembers = (row: KnowledgeBaseItem) => {
  router.push({ path: '/member-management', query: { kbId: String(row.id) } })
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.knowledge-base-management {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
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
  width: 140px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.add-btn {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #3b82f6;

  &:hover {
    background: #dbeafe;
    border-color: #60a5fa;
    color: #2563eb;
  }
}

.batch-delete-btn {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #ef4444;

  &:hover {
    background: #fee2e2;
    border-color: #f87171;
    color: #dc2626;
  }

  &.is-disabled {
    background: #fef2f2;
    border-color: #fecaca;
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

.status-tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: 12px;
  line-height: 20px;
  border-radius: 4px;

  &.status-on {
    background: #ecfdf5;
    color: #059669;
  }

  &.status-off {
    background: #fef2f2;
    color: #dc2626;
  }
}

.action-btns {
  display: flex;
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

  &.member-btn {
    background: #10b981;

    &:hover {
      background: #059669;
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

.form-tip {
  margin-left: 12px;
  font-size: 12px;
  color: #94a3b8;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>