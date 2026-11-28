<template>
  <div class="model-config-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">模型配置</h2>
        <p class="page-subtitle">统一管理对话 / 查询改写 / 精排三类模型，保存后下一次请求即时生效</p>
      </div>
      <div class="header-right">
        <el-button :loading="reloading" @click="handleReload">
          <el-icon><RefreshRight /></el-icon>
          <span>重载快照</span>
        </el-button>
        <el-button type="primary" @click="openCreate">
          <el-icon><Plus /></el-icon>
          <span>新增配置</span>
        </el-button>
      </div>
    </div>

    <!-- 当前生效概览 -->
    <div class="active-overview">
      <div
        v-for="item in overviewCards"
        :key="item.bizType"
        class="overview-card"
        :class="{ 'is-active': item.config, 'is-current': activeTab === item.bizType }"
        @click="activeTab = item.bizType"
      >
        <div class="overview-head">
          <span class="overview-type">{{ item.label }}</span>
          <el-tag v-if="item.config" type="success" size="small" effect="dark">生效中</el-tag>
          <el-tag v-else type="info" size="small" effect="plain">未配置</el-tag>
        </div>
        <template v-if="item.config">
          <div class="overview-name" :title="item.config.name">{{ item.config.name }}</div>
          <div class="overview-meta">
            <span>{{ providerLabel(item.config.provider) }}</span>
            <span class="dot">·</span>
            <span class="mono">{{ item.config.modelName || '-' }}</span>
          </div>
        </template>
        <template v-else>
          <div class="overview-name overview-name--empty">回落 yml 配置</div>
          <div class="overview-meta">该类型暂无生效配置</div>
        </template>
      </div>
    </div>

    <!-- Tab + 表格 -->
    <div class="table-card">
      <el-tabs v-model="activeTab" class="type-tabs">
        <el-tab-pane
          v-for="tab in BIZ_TABS"
          :key="tab.value"
          :name="tab.value"
          :label="`${tab.label} (${countOf(tab.value)})`"
        />
      </el-tabs>

      <el-table v-loading="loading" :data="tabConfigs" stripe class="config-table">
        <el-table-column label="名称" min-width="200">
          <template #default="{ row }">
            <div class="name-cell">
              <span class="name-main">{{ row.name }}</span>
              <span class="name-sub mono">{{ row.modelName || '未指定模型' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="供应商" width="140">
          <template #default="{ row }">
            <el-tag :type="providerTagType(row.provider)" size="small" effect="light">
              {{ providerLabel(row.provider) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="地址" min-width="220">
          <template #default="{ row }">
            <span v-if="row.baseUrl" class="mono url-text">{{ row.baseUrl }}</span>
            <span v-else class="muted-text">{{ baseUrlFallback(row.provider) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="API Key" width="150">
          <template #default="{ row }">
            <div class="key-cell">
              <el-tag :type="row.hasApiKey ? 'success' : 'info'" size="small" effect="plain">
                {{ row.hasApiKey ? '已配置' : '未配置' }}
              </el-tag>
              <span class="key-source">{{ keySourceLabel(row.apiKeyMode, row.apiKeyRef) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.active" type="success" size="small">生效中</el-tag>
            <span v-else class="muted-text">未生效</span>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="160">
          <template #default="{ row }">
            <span class="muted-text">{{ formatTime(row.updatedAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-tooltip
              :disabled="!row.active"
              content="当前生效中"
              placement="top"
            >
              <span>
                <el-button
                  link
                  type="success"
                  size="small"
                  :disabled="row.active || activatingId === row.id"
                  :loading="activatingId === row.id"
                  @click="handleActivate(row)"
                >
                  激活
                </el-button>
              </span>
            </el-tooltip>
            <el-button
              link
              type="primary"
              size="small"
              :loading="testingIds.has(row.id)"
              @click="handleTest(row)"
            >
              测试
            </el-button>
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-tooltip
              :disabled="!row.active"
              content="生效中的配置不可删除，请先激活其它配置"
              placement="top"
            >
              <span>
                <el-button
                  link
                  type="danger"
                  size="small"
                  :disabled="row.active"
                  @click="handleDelete(row)"
                >
                  删除
                </el-button>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="暂无模型配置">
            <p class="empty-hint">
              若后端未执行 <code>sql/model_config.sql</code>，请先初始化；当前所有功能回落
              application.yml 配置。
            </p>
          </el-empty>
        </template>
      </el-table>
    </div>

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑模型配置' : '新增模型配置'"
      width="640px"
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <el-form :model="form" label-width="110px" class="config-form">
        <div class="form-section-title">基本信息</div>
        <el-form-item label="业务类型" required>
          <el-select
            v-model="form.bizType"
            class="full-width"
            :disabled="editingId != null"
          >
            <el-option v-for="t in BIZ_TABS" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="同类型下唯一，例如：通义千问 Qwen-Plus" maxlength="64" />
        </el-form-item>

        <div class="form-section-title">连接配置</div>
        <el-form-item label="供应商" required>
          <el-select v-model="form.provider" class="full-width">
            <el-option
              v-for="p in providerOptions"
              :key="p.value"
              :label="p.label"
              :value="p.value"
            />
          </el-select>
          <div v-if="providerHint" class="field-hint">{{ providerHint }}</div>
        </el-form-item>
        <el-form-item v-if="showBaseUrl" label="服务地址" :required="baseUrlRequired">
          <el-input
            v-model="form.baseUrl"
            class="mono-input"
            :placeholder="baseUrlPlaceholder"
          />
        </el-form-item>
        <el-form-item label="模型名" :required="modelNameRequired">
          <el-input v-model="form.modelName" :placeholder="modelNamePlaceholder" />
        </el-form-item>

        <div class="form-section-title">运行参数</div>
        <el-form-item v-if="showSampling" label="temperature">
          <el-input-number v-model="form.temperature" :min="0" :max="2" :step="0.1" :precision="2" />
        </el-form-item>
        <el-form-item v-if="showSampling" label="maxTokens">
          <el-input-number v-model="form.maxTokens" :min="1" :max="200000" controls-position="right" />
        </el-form-item>
        <el-form-item label="超时(ms)">
          <el-input-number v-model="form.timeoutMs" :min="1000" :max="600000" :step="1000" controls-position="right" />
          <div v-if="isRerank" class="field-hint">精排建议 15000~30000，默认 15000。</div>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" controls-position="right" />
        </el-form-item>

        <template v-if="showKey">
          <div class="form-section-title">API Key</div>
          <el-form-item label="配置方式" :required="keyRequired">
            <el-radio-group v-model="form.keyMode">
              <el-radio v-if="editingId" value="keep">保持不变</el-radio>
              <el-radio v-if="!editingId && !keyRequired" value="none">不配置</el-radio>
              <el-radio value="ref">环境变量引用</el-radio>
              <el-radio value="plain">明文粘贴</el-radio>
              <el-radio v-if="editingId && !keyRequired" value="clear">清空 Key</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="editingId" label="当前状态">
            <span class="current-key">{{ keySourceLabel(editingConfig?.apiKeyMode, editingConfig?.apiKeyRef) }}</span>
          </el-form-item>
          <el-form-item v-if="form.keyMode === 'ref'" label="变量名" required>
            <el-input v-model="form.apiKeyRef" placeholder="DASHSCOPE_API_KEY（可带 env: 前缀）" />
            <div class="field-hint">推荐使用环境变量引用，服务端运行时读取，不落库敏感信息。</div>
          </el-form-item>
          <el-form-item v-if="form.keyMode === 'plain'" label="API Key" required>
            <el-input
              v-model="form.apiKey"
              type="password"
              show-password
              autocomplete="new-password"
              placeholder="sk-xxxx"
            />
            <div class="field-hint">服务端加密后存储；需后端配置 MODEL_CONFIG_SECRET，否则保存会报 400。</div>
          </el-form-item>
        </template>

        <template v-if="!editingId">
          <div class="form-section-title">生效</div>
          <el-form-item label="立即生效">
            <el-switch v-model="form.active" />
            <span class="field-hint inline">开启后会取消同类型其它配置的生效状态。</span>
          </el-form-item>
        </template>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 连通性测试结果 -->
    <el-dialog v-model="testDialogVisible" title="连通性测试" width="480px">
      <div v-if="testResult" class="test-result">
        <el-result
          :icon="testResult.success ? 'success' : 'error'"
          :title="testResult.success ? '连通正常' : '连通失败'"
          :sub-title="`耗时 ${testResult.latencyMs} ms`"
        >
          <template #extra>
            <div class="test-message" :class="testResult.success ? 'ok' : 'fail'">
              {{ testResult.message }}
            </div>
          </template>
        </el-result>
      </div>
      <template #footer>
        <el-button type="primary" @click="testDialogVisible = false">知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, RefreshRight } from '@element-plus/icons-vue'
import { modelConfigApi } from '@/api/model-config'
import type {
  ApiKeyMode,
  BizType,
  ModelConfigRequest,
  ModelConfigTestResult,
  ModelConfigVO,
  ModelProvider
} from '@/types/model-config'

// ---------- 常量 ----------
const BIZ_TABS: Array<{ value: BizType; label: string }> = [
  { value: 'CHAT', label: '对话' },
  { value: 'REWRITE', label: '查询改写' },
  { value: 'RERANK', label: '精排' }
]

const PROVIDER_LABEL: Record<ModelProvider, string> = {
  OPENAI_COMPAT: 'OpenAI 兼容',
  OLLAMA: 'Ollama 本地',
  ONNX: 'ONNX 本地',
  DASHSCOPE: 'DashScope',
  AUTO: 'AUTO 自动'
}

const ALLOWED_PROVIDERS: Record<BizType, ModelProvider[]> = {
  CHAT: ['OPENAI_COMPAT', 'OLLAMA'],
  REWRITE: ['OPENAI_COMPAT', 'OLLAMA'],
  // 精排只保留三种有效 provider：OPENAI_COMPAT / OLLAMA 在 RERANK 下会被后端当作本地 ONNX，
  // 容易让人误以为配了云端精排，因此不下放。
  RERANK: ['ONNX', 'DASHSCOPE', 'AUTO']
}

// ---------- 列表 ----------
const loading = ref(false)
const reloading = ref(false)
const configs = ref<ModelConfigVO[]>([])
const activeTab = ref<BizType>('CHAT')

const loadList = async () => {
  loading.value = true
  try {
    configs.value = await modelConfigApi.getList()
  } finally {
    loading.value = false
  }
}

const activeOf = (bizType: BizType) => configs.value.find((c) => c.bizType === bizType && c.active) ?? null

const overviewCards = computed(() =>
  BIZ_TABS.map((t) => ({
    bizType: t.value,
    label: t.label,
    config: activeOf(t.value)
  }))
)

const countOf = (bizType: BizType) => configs.value.filter((c) => c.bizType === bizType).length

const tabConfigs = computed(() =>
  configs.value
    .filter((c) => c.bizType === activeTab.value)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
)

// ---------- 展示工具 ----------
const providerLabel = (p: ModelProvider) => PROVIDER_LABEL[p] ?? p
const providerTagType = (p: ModelProvider) => {
  switch (p) {
    case 'OPENAI_COMPAT': return 'primary'
    case 'OLLAMA': return 'success'
    case 'DASHSCOPE': return 'warning'
    default: return 'info'
  }
}
const keySourceLabel = (mode: ApiKeyMode | undefined, keyRef?: string | null) => {
  if (mode === 'ENV') return keyRef ? `环境变量 ${keyRef}` : '环境变量引用'
  if (mode === 'ENCRYPTED') return '已加密存储'
  return '未配置'
}
const baseUrlFallback = (p: ModelProvider) => {
  if (p === 'OLLAMA') return '默认 http://localhost:11434'
  if (p === 'ONNX') return '本地模型，无需地址'
  if (p === 'AUTO') return '自动选择'
  return '-'
}
const formatTime = (iso: string | null | undefined) => (iso ? iso.replace('T', ' ').slice(0, 16) : '-')

// ---------- 表单 ----------
type KeyMode = 'keep' | 'none' | 'ref' | 'plain' | 'clear'

const dialogVisible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const editingConfig = ref<ModelConfigVO | null>(null)

const form = reactive({
  bizType: 'CHAT' as BizType,
  name: '',
  provider: 'OPENAI_COMPAT' as ModelProvider,
  baseUrl: '',
  modelName: '',
  temperature: 0.7 as number | undefined,
  maxTokens: undefined as number | undefined,
  timeoutMs: 60000 as number | undefined,
  sortOrder: 0,
  keyMode: 'none' as KeyMode,
  apiKeyRef: '',
  apiKey: '',
  active: false
})

const providerOptions = computed(() =>
  ALLOWED_PROVIDERS[form.bizType].map((p) => ({ value: p, label: PROVIDER_LABEL[p] }))
)

const isRerank = computed(() => form.bizType === 'RERANK')

/** 字段显隐：隐藏 = 不渲染且不提交（见接口文档 7.1 矩阵） */
const showBaseUrl = computed(() => form.provider !== 'ONNX')
const showKey = computed(() =>
  ['OPENAI_COMPAT', 'DASHSCOPE', 'AUTO'].includes(form.provider)
)
const showSampling = computed(() => !isRerank.value) // temperature / maxTokens
// extraJson 当前版本后端不读取，所有类型一律隐藏

const baseUrlRequired = computed(() => form.provider === 'OPENAI_COMPAT' || form.provider === 'DASHSCOPE')
const modelNameRequired = computed(() => form.provider !== 'AUTO')
/** 云端 provider 必须配 Key；本地 OLLAMA / ONNX 不需要 */
const keyRequired = computed(() => showKey.value)
const baseUrlPlaceholder = computed(() => {
  if (form.provider === 'OLLAMA') return '留空则使用 http://localhost:11434'
  if (form.provider === 'DASHSCOPE') return '完整 .../services/rerank/text-rerank/text-rerank，或仅填 host'
  if (form.provider === 'AUTO') return '一般留空；可填 https://dashscope.aliyuncs.com'
  return 'https://api.deepseek.com'
})
const modelNamePlaceholder = computed(() => {
  if (form.provider === 'OLLAMA') return '例如 qwen2.5:3b'
  if (form.provider === 'ONNX') return '例如 bge-reranker-v2-m3'
  if (form.provider === 'DASHSCOPE') return '例如 qwen3.7-text-rerank'
  if (form.provider === 'AUTO') return '留空默认 gte-rerank-v2'
  return '例如 deepseek-v4-flash'
})
const providerHint = computed(() => {
  if (!isRerank.value) return ''
  switch (form.provider) {
    case 'ONNX':
      return '本机进程内运行，无需地址与 Key；模型未加载时会静默返回原始顺序（精排实际未生效）。'
    case 'DASHSCOPE':
      return '阿里云 / 私有 MaaS 网关，必须配置 Key；失败会抛错并暴露在测试与日志中。'
    case 'AUTO':
      return '云端优先，失败静默回退本地 ONNX；本地未加载则返回原始顺序。'
    default:
      return ''
  }
})

// 新增时切换业务类型，若 provider 不合法则重置，并按类型给默认超时
watch(
  () => form.bizType,
  () => {
    if (!ALLOWED_PROVIDERS[form.bizType].includes(form.provider)) {
      form.provider = ALLOWED_PROVIDERS[form.bizType][0]
    }
    if (editingId.value == null) {
      form.timeoutMs = form.bizType === 'RERANK' ? 15000 : 60000
    }
    syncKeyMode()
  }
)

// provider 变化会改变 Key 区显隐/必填，需要同步配置方式，避免出现"必填但选了不配置"
watch(
  () => form.provider,
  () => syncKeyMode()
)

let suppressKeySync = false

function syncKeyMode() {
  // 编辑回显期间不清理/纠正，避免 provider watcher 覆盖刚回填的 apiKeyMode / apiKeyRef
  if (suppressKeySync) return
  form.apiKey = ''
  form.apiKeyRef = ''
  if (!showKey.value) {
    form.keyMode = editingId.value != null ? 'keep' : 'none'
    return
  }
  if (editingId.value != null) {
    if (form.keyMode === 'none' || (form.keyMode === 'clear' && keyRequired.value)) {
      form.keyMode = 'keep'
    }
  } else if (keyRequired.value && form.keyMode !== 'ref' && form.keyMode !== 'plain') {
    form.keyMode = 'ref'
  }
}

const resetForm = () => {
  editingId.value = null
  editingConfig.value = null
  form.bizType = activeTab.value
  form.name = ''
  form.provider = ALLOWED_PROVIDERS[activeTab.value][0]
  form.baseUrl = ''
  form.modelName = ''
  form.temperature = 0.7
  form.maxTokens = undefined
  form.timeoutMs = activeTab.value === 'RERANK' ? 15000 : 60000
  form.sortOrder = 0
  form.keyMode = showKey.value && keyRequired.value ? 'ref' : 'none'
  form.apiKeyRef = ''
  form.apiKey = ''
  form.active = false
}

const openCreate = () => {
  resetForm()
  dialogVisible.value = true
}

const openEdit = (row: ModelConfigVO) => {
  // 回显期间屏蔽 provider/bizType watcher 对 Key 区的自动纠正
  suppressKeySync = true
  editingId.value = row.id
  editingConfig.value = row
  form.bizType = row.bizType
  form.name = row.name
  form.provider = row.provider
  form.baseUrl = row.baseUrl ?? ''
  form.modelName = row.modelName ?? ''
  form.temperature = row.temperature ?? undefined
  form.maxTokens = row.maxTokens ?? undefined
  form.timeoutMs = row.timeoutMs ?? undefined
  form.sortOrder = row.sortOrder

  if (row.apiKeyMode === 'ENV') {
    // 变量名不是密钥，后端允许安全回填
    form.keyMode = 'ref'
    form.apiKeyRef = row.apiKeyRef ?? ''
  } else if (row.apiKeyMode === 'ENCRYPTED') {
    // 密文/明文均不返回，只能保持不变；需要更换时由用户主动选择明文粘贴
    form.keyMode = 'keep'
    form.apiKeyRef = ''
  } else {
    form.keyMode = showKey.value && keyRequired.value ? 'ref' : 'keep'
    form.apiKeyRef = ''
  }
  form.apiKey = ''
  form.active = row.active
  dialogVisible.value = true
  nextTick(() => {
    suppressKeySync = false
  })
}

const validateForm = (): string | null => {
  if (!form.bizType) return '请选择业务类型'
  if (!form.name.trim()) return '名称不能为空'
  if (!ALLOWED_PROVIDERS[form.bizType].includes(form.provider)) {
    return `${BIZ_TABS.find((t) => t.value === form.bizType)?.label} 不支持 ${providerLabel(form.provider)}`
  }
  const duplicated = configs.value.some(
    (c) =>
      c.bizType === form.bizType &&
      c.name === form.name.trim() &&
      c.id !== editingId.value
  )
  if (duplicated) return '同类型下名称已存在'

  if (showBaseUrl.value && baseUrlRequired.value && !form.baseUrl.trim()) {
    return `${providerLabel(form.provider)} 需要配置服务地址`
  }
  if (modelNameRequired.value && !form.modelName.trim()) {
    return `${providerLabel(form.provider)} 需要配置模型名`
  }

  if (showKey.value) {
    if (form.keyMode === 'ref' && !form.apiKeyRef.trim()) return '请填写环境变量名'
    if (form.keyMode === 'plain' && !form.apiKey.trim()) return '请填写 API Key'
    if (keyRequired.value) {
      if (form.keyMode === 'none' || form.keyMode === 'clear') {
        return '云端供应商需要配置 API Key，可选择环境变量引用或明文粘贴'
      }
      if (form.keyMode === 'keep' && !editingConfig.value?.hasApiKey) {
        return '当前配置尚未设置 Key，请选择环境变量引用或明文粘贴'
      }
    }
  }
  return null
}

const buildPayload = (): ModelConfigRequest => {
  const payload: ModelConfigRequest = {
    bizType: form.bizType,
    name: form.name.trim(),
    provider: form.provider,
    modelName: form.modelName.trim() || null,
    timeoutMs: form.timeoutMs ?? null,
    sortOrder: form.sortOrder
  }
  // 隐藏字段一律不提交：ONNX 不带 baseUrl；精排不带 temperature / maxTokens；extraJson 全类型隐藏
  if (showBaseUrl.value) payload.baseUrl = form.baseUrl.trim() || null
  if (showSampling.value) {
    payload.temperature = form.temperature ?? null
    payload.maxTokens = form.maxTokens ?? null
  }
  if (editingId.value == null) payload.active = form.active

  if (showKey.value) {
    if (form.keyMode === 'ref') payload.apiKeyRef = form.apiKeyRef.trim()
    else if (form.keyMode === 'plain') payload.apiKey = form.apiKey.trim()
    else if (form.keyMode === 'clear') payload.clearApiKey = true
  }

  return payload
}

const submit = async () => {
  const error = validateForm()
  if (error) {
    ElMessage.warning(error)
    return
  }
  submitting.value = true
  try {
    if (editingId.value != null) {
      await modelConfigApi.update(editingId.value, buildPayload())
    } else {
      await modelConfigApi.create(buildPayload())
    }
    ElMessage.success('配置已保存，下一次请求即生效')
    dialogVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

// ---------- 行操作 ----------
const activatingId = ref<number | null>(null)

const handleActivate = async (row: ModelConfigVO) => {
  try {
    await ElMessageBox.confirm(
      `确认将「${row.name}」设为${BIZ_TABS.find((t) => t.value === row.bizType)?.label}的生效配置？同类型其它配置将自动取消生效。`,
      '激活配置',
      { type: 'warning' }
    )
  } catch {
    return
  }
  activatingId.value = row.id
  try {
    await modelConfigApi.activate(row.id)
    ElMessage.success('已切换生效配置，下一次请求即生效')
    await loadList()
  } finally {
    activatingId.value = null
  }
}

const handleDelete = async (row: ModelConfigVO) => {
  try {
    await ElMessageBox.confirm(`确认删除配置「${row.name}」？`, '删除配置', { type: 'warning' })
  } catch {
    return
  }
  await modelConfigApi.remove(row.id)
  ElMessage.success('已删除')
  await loadList()
}

const testingIds = ref<Set<number>>(new Set())
const testDialogVisible = ref(false)
const testResult = ref<ModelConfigTestResult | null>(null)

const handleTest = async (row: ModelConfigVO) => {
  testingIds.value.add(row.id)
  try {
    const result = await modelConfigApi.test(row.id)
    testResult.value = result
    testDialogVisible.value = true
  } finally {
    testingIds.value.delete(row.id)
  }
}

const handleReload = async () => {
  try {
    await ElMessageBox.confirm(
      '将从数据库重新加载模型配置快照，确定继续？',
      '重载快照',
      { type: 'warning' }
    )
  } catch {
    return
  }
  reloading.value = true
  try {
    await modelConfigApi.reload()
    ElMessage.success('已重载，下一次请求即生效')
    await loadList()
  } finally {
    reloading.value = false
  }
}

onMounted(loadList)
</script>

<style scoped lang="scss">
.model-config-page {
  padding: 20px 24px;
  background: #f8fafc;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 16px;

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
  .header-right { display: flex; gap: 8px; }
}

.active-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.overview-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover { border-color: #a5b4fc; }
  &.is-active {
    border-color: #6366f1;
    background: linear-gradient(135deg, #eef2ff, #fff);
  }
  &.is-current { box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.18); }

  .overview-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .overview-type {
    font-size: 13px;
    color: #475569;
    font-weight: 600;
  }
  .overview-name {
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 4px;

    &--empty { color: #94a3b8; font-weight: 500; }
  }
  .overview-meta {
    font-size: 12px;
    color: #64748b;
    .dot { margin: 0 6px; color: #cbd5e1; }
  }
}

.table-card {
  background: #fff;
  border-radius: 8px;
  padding: 8px 20px 20px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.type-tabs {
  margin-bottom: 4px;
}

.name-cell {
  .name-main {
    display: block;
    font-weight: 500;
    color: #1e293b;
  }
  .name-sub {
    display: block;
    font-size: 12px;
    color: #94a3b8;
    margin-top: 2px;
  }
}

.key-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  .key-source { font-size: 12px; color: #94a3b8; }
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.url-text {
  font-size: 12px;
  color: #475569;
  word-break: break-all;
}
.muted-text { color: #94a3b8; font-size: 13px; }
.empty-hint {
  font-size: 12px;
  color: #94a3b8;
  margin: 4px 0 0;
}

.config-form {
  max-height: 62vh;
  overflow-y: auto;
  padding-right: 4px;
}

.form-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin: 8px 0 12px;
  padding-left: 8px;
  border-left: 3px solid #6366f1;
}

.full-width { width: 100%; }
.mono-input :deep(input),
.mono-input :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.field-hint {
  font-size: 12px;
  color: #94a3b8;
  line-height: 18px;
  margin-top: 4px;
  &.inline { margin-left: 10px; display: inline-block; margin-top: 0; }
}

.current-key {
  font-size: 13px;
  color: #475569;
}

.test-result {
  padding: 0 8px;
  .test-message {
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 13px;
    line-height: 1.6;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;

    &.ok { background: #f0fdf4; color: #15803d; }
    &.fail { background: #fef2f2; color: #b91c1c; }
  }
}

@media (max-width: 1200px) {
  .active-overview { grid-template-columns: 1fr; }
}
</style>
