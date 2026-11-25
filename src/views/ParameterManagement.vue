<template>
  <div class="param-management">
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button :loading="loading" @click="fetchParams">
          <el-icon :size="16"><Refresh /></el-icon>
          <span>刷新</span>
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-button @click="openHistory">
          <el-icon :size="16"><Clock /></el-icon>
          <span>操作历史</span>
        </el-button>
        <el-button v-if="isAdmin" type="danger" plain @click="handleResetGlobal">
          <el-icon :size="16"><Delete /></el-icon>
          <span>重置全局配置</span>
        </el-button>
      </div>
    </div>

    <div class="scope-hint">
      <el-icon :size="14"><InfoFilled /></el-icon>
      <span>
        以下参数对所有知识库统一生效，生效优先级：全局已应用 &gt; 元数据默认值
      </span>
    </div>

    <div class="table-wrapper" v-loading="loading">
      <el-empty
        v-if="!loading && params.length === 0"
        description="暂无参数配置"
        :image-size="120"
      />
      <el-collapse v-else v-model="activeCollapse" class="param-collapse">
        <el-collapse-item
          v-for="group in groupedParams"
          :key="group.category"
          :name="group.category"
        >
          <template #title>
            <div class="collapse-title">
              <span class="collapse-title-name">{{ group.category }}</span>
              <span class="collapse-title-count">{{ group.items.length }} 项</span>
            </div>
          </template>

          <el-table :data="group.items" :header-cell-style="headerCellStyle">
            <el-table-column label="参数" min-width="220">
              <template #default="{ row }">
                <div class="param-cell">
                  <div class="param-name">
                    {{ row.paramName }}
                    <el-tooltip placement="top">
                      <template #content>
                        <div class="param-tip-content">
                          <div>{{ row.description }}</div>
                          <div class="param-tip-meta">默认值：{{ formatValue(row, row.defaultValue) }}</div>
                          <div v-if="rangeText(row) !== '—'" class="param-tip-meta">
                            取值范围：{{ rangeText(row) }}
                          </div>
                        </div>
                      </template>
                      <el-icon class="param-tip"><InfoFilled /></el-icon>
                    </el-tooltip>
                  </div>
                  <div class="param-key">{{ row.paramKey }}</div>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="类型" width="90" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="typeTagType(row.paramType)" effect="plain">
                  {{ row.paramType }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="生效值" width="160" align="center">
              <template #default="{ row }">
                <div class="effective-value">{{ formatValue(row, row.effectiveValue) }}</div>
                <div class="value-state">
                  <el-tag v-if="hasDraft(row)" size="small" type="warning">有草稿未应用</el-tag>
                  <el-tag v-else-if="hasApplied(row)" size="small" type="success">全局已配置</el-tag>
                  <span v-else class="value-state-default">使用默认值</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="已应用值" width="110" align="center">
              <template #default="{ row }">
                <span :class="{ 'muted-value': row.appliedValue == null }">
                  {{ formatValue(row, row.appliedValue) }}
                </span>
              </template>
            </el-table-column>

            <el-table-column label="草稿值" width="110" align="center">
              <template #default="{ row }">
                <span :class="{ 'muted-value': row.draftValue == null }">
                  {{ formatValue(row, row.draftValue) }}
                </span>
              </template>
            </el-table-column>

            <el-table-column label="取值范围" width="110" align="center">
              <template #default="{ row }">
                {{ rangeText(row) }}
              </template>
            </el-table-column>

            <el-table-column label="操作" width="210" align="center">
              <template #default="{ row }">
                <div class="action-btns">
                  <el-button size="small" @click="openEdit(row)">编辑</el-button>
                  <el-button
                    v-if="isAdmin"
                    size="small"
                    type="primary"
                    :disabled="!hasDraft(row)"
                    @click="handleApply(row)"
                  >
                    应用
                  </el-button>
                  <el-button
                    v-if="isAdmin"
                    size="small"
                    type="danger"
                    :disabled="row.appliedValue == null && row.draftValue == null"
                    @click="handleRollback(row)"
                  >
                    回退
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-collapse-item>
      </el-collapse>
    </div>

    <el-dialog
      v-model="editVisible"
      :title="`编辑参数 - ${editForm?.paramName ?? ''}`"
      width="480px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="edit-desc">
        <div class="edit-desc-key">{{ editForm?.paramKey }}</div>
        <div class="edit-desc-text">{{ editForm?.description }}</div>
        <div v-if="editForm && rangeText(editForm) !== '—'" class="edit-desc-range">
          取值范围：{{ rangeText(editForm) }}
        </div>
      </div>
      <el-form label-width="90px" label-position="right" @submit.prevent>
        <el-form-item label="参数值">
          <el-input-number
            v-if="editForm?.paramType === 'INT'"
            v-model="editNumberValue"
            :min="editMin"
            :max="editMax"
            :step="1"
            controls-position="right"
            style="width: 100%"
          />
          <el-input-number
            v-else-if="editForm?.paramType === 'DOUBLE'"
            v-model="editNumberValue"
            :min="editMin"
            :max="editMax"
            :step="0.01"
            :precision="4"
            controls-position="right"
            style="width: 100%"
          />
          <el-switch
            v-else-if="editForm?.paramType === 'BOOLEAN'"
            v-model="editBooleanValue"
            active-text="是"
            inactive-text="否"
          />
          <el-input v-else v-model="editStringValue" placeholder="请输入参数值" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSave">保存草稿</el-button>
        </div>
      </template>
    </el-dialog>

    <el-drawer v-model="historyVisible" title="操作历史" size="640px">
      <div class="history-filter">
        <el-select
          v-model="historyParamKey"
          placeholder="全部参数"
          clearable
          filterable
          style="width: 240px"
          @change="fetchHistory"
        >
          <el-option
            v-for="p in params"
            :key="p.paramKey"
            :label="p.paramName"
            :value="p.paramKey"
          />
        </el-select>
      </div>
      <el-table
        :data="historyList"
        v-loading="historyLoading"
        :header-cell-style="headerCellStyle"
      >
        <el-table-column prop="paramKey" label="参数键" min-width="180" show-overflow-tooltip />
        <el-table-column label="动作" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="actionTagType(row.action)">{{ actionText(row.action) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="变更" width="160" align="center">
          <template #default="{ row }">
            <span class="history-change">
              <span class="history-old">{{ row.oldValue ?? '—' }}</span>
              <span class="history-arrow">→</span>
              <span class="history-new">{{ row.newValue ?? '—' }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="operatorName" label="操作人" width="110" align="center" />
        <el-table-column prop="operateTime" label="操作时间" min-width="160" align="center" />
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Clock, Delete, InfoFilled, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { paramApi } from '@/api/param'
import { useUserStore } from '@/stores/user'
import type { ParamItemVO, ParamHistory, ParamType, ParamAction } from '@/types/param'

const userStore = useUserStore()

const params = ref<ParamItemVO[]>([])
const loading = ref(false)
const submitting = ref(false)
const activeCollapse = ref<string[]>([])
let collapseInitialized = false

const editVisible = ref(false)
const editForm = ref<ParamItemVO | null>(null)
const editNumberValue = ref(0)
const editBooleanValue = ref(false)
const editStringValue = ref('')

const historyVisible = ref(false)
const historyParamKey = ref('')
const historyList = ref<ParamHistory[]>([])
const historyLoading = ref(false)

const headerCellStyle = {
  background: '#f8fafc',
  color: '#64748b',
  fontWeight: '600',
  fontSize: '13px',
  borderBottom: '2px solid #e2e8f0'
}

const ADMIN_ROLES = ['OWNER', 'ADMIN']

const isAdmin = computed(() => {
  const role = (userStore.user?.role || '').toUpperCase()
  return ADMIN_ROLES.includes(role)
})

const groupedParams = computed(() => {
  const groups = new Map<string, ParamItemVO[]>()
  params.value.forEach((item) => {
    const list = groups.get(item.category)
    if (list) {
      list.push(item)
    } else {
      groups.set(item.category, [item])
    }
  })
  return Array.from(groups, ([category, items]) => ({
    category,
    items: [...items].sort((a, b) => a.sortOrder - b.sortOrder)
  }))
})

const parseNum = (v: string | null | undefined): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

const editMin = computed(() => parseNum(editForm.value?.minValue) ?? undefined)
const editMax = computed(() => parseNum(editForm.value?.maxValue) ?? undefined)

const formatValue = (row: ParamItemVO, value: string | null): string => {
  if (value == null) return '—'
  if (row.paramType === 'BOOLEAN') return value === 'true' ? '是' : '否'
  return value
}

const hasApplied = (row: ParamItemVO) => row.appliedValue != null

const hasDraft = (row: ParamItemVO) =>
  row.draftValue != null && row.draftValue !== row.appliedValue

const rangeText = (row: ParamItemVO | null): string => {
  if (!row) return '—'
  if (row.paramType !== 'INT' && row.paramType !== 'DOUBLE') return '—'
  const min = row.minValue ?? ''
  const max = row.maxValue ?? ''
  if (!min && !max) return '—'
  return `${min} ~ ${max}`
}

const typeTagType = (t: ParamType) => {
  if (t === 'INT') return 'primary'
  if (t === 'DOUBLE') return 'success'
  if (t === 'BOOLEAN') return 'warning'
  return 'info'
}

const actionText = (a: ParamAction) => {
  const map: Record<ParamAction, string> = {
    SAVE: '保存',
    APPLY: '应用',
    ROLLBACK: '回退',
    RESET: '重置'
  }
  return map[a] || a
}

const actionTagType = (a: ParamAction) => {
  if (a === 'APPLY') return 'success'
  if (a === 'ROLLBACK' || a === 'RESET') return 'danger'
  return 'info'
}

const fetchParams = async () => {
  loading.value = true
  try {
    params.value = await paramApi.getList()
    if (!collapseInitialized && params.value.length > 0) {
      activeCollapse.value = groupedParams.value.map((group) => group.category)
      collapseInitialized = true
    }
  } catch {
    params.value = []
  } finally {
    loading.value = false
  }
}

const openEdit = (row: ParamItemVO) => {
  editForm.value = row
  const current = row.draftValue ?? row.effectiveValue
  if (row.paramType === 'BOOLEAN') {
    editBooleanValue.value = current === 'true'
  } else if (row.paramType === 'INT' || row.paramType === 'DOUBLE') {
    editNumberValue.value = parseNum(current) ?? 0
  } else {
    editStringValue.value = current
  }
  editVisible.value = true
}

const handleSave = async () => {
  if (!editForm.value) return

  let value = ''
  if (editForm.value.paramType === 'BOOLEAN') {
    value = editBooleanValue.value ? 'true' : 'false'
  } else if (editForm.value.paramType === 'INT' || editForm.value.paramType === 'DOUBLE') {
    const num = editNumberValue.value
    if (num == null || Number.isNaN(num)) {
      ElMessage.warning('请输入有效的数值')
      return
    }
    if (editMin.value != null && num < editMin.value) {
      ElMessage.warning(`参数值不能小于 ${editMin.value}`)
      return
    }
    if (editMax.value != null && num > editMax.value) {
      ElMessage.warning(`参数值不能大于 ${editMax.value}`)
      return
    }
    value = String(num)
  } else {
    value = editStringValue.value
  }

  if (value === '') {
    ElMessage.warning('请输入参数值')
    return
  }

  submitting.value = true
  try {
    await paramApi.save({
      paramKey: editForm.value.paramKey,
      paramValue: value
    })
    ElMessage.success('草稿已保存')
    editVisible.value = false
    fetchParams()
  } catch {
    // 错误提示已由请求拦截器统一处理
  } finally {
    submitting.value = false
  }
}

const handleApply = async (row: ParamItemVO) => {
  if (!hasDraft(row)) return
  submitting.value = true
  try {
    await paramApi.apply({ paramKey: row.paramKey })
    ElMessage.success('参数已应用并生效')
    fetchParams()
  } catch {
    // 错误提示已由请求拦截器统一处理
  } finally {
    submitting.value = false
  }
}

const handleRollback = async (row: ParamItemVO) => {
  try {
    await ElMessageBox.confirm(
      `确认将「${row.paramName}」回退到默认值？全局的草稿与已应用配置将被删除。`,
      '回退确认',
      { type: 'warning', confirmButtonText: '确认回退', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  submitting.value = true
  try {
    await paramApi.rollback({ paramKey: row.paramKey })
    ElMessage.success('已回退到默认值')
    fetchParams()
  } catch {
    // 错误提示已由请求拦截器统一处理
  } finally {
    submitting.value = false
  }
}

const handleResetGlobal = async () => {
  try {
    await ElMessageBox.confirm(
      '确认清空全局参数配置？所有草稿与已应用配置将被删除，参数将回退到元数据默认值。',
      '重置确认',
      { type: 'warning', confirmButtonText: '确认重置', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  submitting.value = true
  try {
    await paramApi.reset()
    ElMessage.success('全局配置已清空')
    fetchParams()
  } catch {
    // 错误提示已由请求拦截器统一处理
  } finally {
    submitting.value = false
  }
}

const openHistory = () => {
  historyParamKey.value = ''
  historyVisible.value = true
  fetchHistory()
}

const fetchHistory = async () => {
  historyLoading.value = true
  try {
    historyList.value = await paramApi.history({
      paramKey: historyParamKey.value || undefined
    })
  } catch {
    historyList.value = []
  } finally {
    historyLoading.value = false
  }
}

onMounted(() => {
  fetchParams()
})
</script>

<style scoped lang="scss">
.param-management {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.scope-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  padding: 8px 14px;
  font-size: 13px;
  color: #64748b;
  background: #eef2ff;
  border: 1px solid #e0e7ff;
  border-radius: 8px;

  .el-icon {
    flex-shrink: 0;
    color: #6366f1;
  }

  strong {
    color: #4338ca;
  }
}

.table-wrapper {
  flex: 1;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: auto;

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

.param-collapse {
  :deep(.el-collapse-item__header) {
    padding: 0 16px;
    font-size: 14px;
    background: #f8fafc;
  }

  :deep(.el-collapse-item__content) {
    padding-bottom: 8px;
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: 1px solid #e2e8f0;
  }
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 10px;

  .collapse-title-name {
    font-weight: 600;
    color: #1e293b;
  }

  .collapse-title-count {
    font-size: 12px;
    font-weight: 400;
    color: #94a3b8;
  }
}

.param-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .param-name {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
    color: #1e293b;

    .param-tip {
      font-size: 13px;
      color: #94a3b8;
      cursor: help;
    }
  }

  .param-key {
    font-size: 12px;
    color: #94a3b8;
    font-family: monospace;
  }
}

.param-tip-content {
  max-width: 260px;
  line-height: 1.6;

  .param-tip-meta {
    margin-top: 4px;
    color: #c7d2fe;
  }
}

.effective-value {
  font-size: 15px;
  font-weight: 700;
  color: #6366f1;
  font-variant-numeric: tabular-nums;
}

.value-state {
  margin-top: 4px;

  .value-state-default {
    font-size: 12px;
    color: #94a3b8;
  }
}

.muted-value {
  color: #cbd5e1;
}

.action-btns {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}

.edit-desc {
  margin-bottom: 16px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;

  .edit-desc-key {
    font-size: 13px;
    font-weight: 600;
    color: #6366f1;
    font-family: monospace;
  }

  .edit-desc-text {
    margin-top: 4px;
    font-size: 13px;
    color: #475569;
  }

  .edit-desc-range {
    margin-top: 4px;
    font-size: 12px;
    color: #94a3b8;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.history-filter {
  margin-bottom: 16px;
}

.history-change {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;

  .history-old {
    color: #94a3b8;
    text-decoration: line-through;
  }

  .history-arrow {
    color: #cbd5e1;
  }

  .history-new {
    color: #6366f1;
    font-weight: 600;
  }
}
</style>