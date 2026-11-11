<template>
  <el-dialog
    :model-value="visible"
    :title="`编辑文档: ${fileName || ''}`"
    width="80%"
    top="6vh"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
    @open="loadContent"
  >
    <div v-loading="loading" class="document-edit">
      <div v-if="error" class="edit-error">
        <el-icon :size="40" color="var(--el-color-danger)"><WarningFilled /></el-icon>
        <p>{{ error }}</p>
        <el-button type="primary" @click="loadContent">重新加载</el-button>
      </div>

      <el-input
        v-else
        v-model="content"
        type="textarea"
        :rows="24"
        class="edit-textarea"
        placeholder="请输入 Markdown 内容"
      />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('update:visible', false)">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="loading || !!error" @click="handleSave">
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { WarningFilled } from '@element-plus/icons-vue'
import { knowledgeManagementApi } from '@/api/knowledge-management'

const props = defineProps<{
  visible: boolean
  documentId: number
  chunkCount: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'saved': []
}>()

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const fileName = ref('')
const content = ref('')

const loadContent = async () => {
  if (!props.documentId) return

  loading.value = true
  error.value = ''
  content.value = ''
  fileName.value = ''

  try {
    const data = await knowledgeManagementApi.getContent(props.documentId)
    fileName.value = data.fileName || ''
    content.value = data.content || ''
  } catch (err: any) {
    error.value = err?.message || '加载文档内容失败'
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  const value = content.value
  if (!value || !value.trim()) {
    ElMessage.warning('内容不能为空')
    return
  }

  if (props.chunkCount > 0) {
    try {
      await ElMessageBox.confirm(
        '文档已有切片，保存后将清空切片并需重新向量化，确定继续吗？',
        '保存确认',
        {
          type: 'warning',
          confirmButtonText: '确定保存',
          cancelButtonText: '取消'
        }
      )
    } catch {
      return
    }
  }

  saving.value = true
  try {
    await knowledgeManagementApi.saveContent(props.documentId, {
      content: value,
      confirm: props.chunkCount > 0
    })
    ElMessage.success('保存成功')
    emit('update:visible', false)
    emit('saved')
  } catch {
    // 错误提示已由拦截器统一处理
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.document-edit {
  min-height: 400px;
}

.edit-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  gap: 12px;
  color: var(--el-text-color-secondary);
  font-size: 14px;

  p {
    margin: 0;
    color: var(--el-color-danger);
  }
}

.edit-textarea {
  :deep(.el-textarea__inner) {
    min-height: 500px;
    font-family: 'Fira Code', 'Consolas', 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.7;
    color: var(--el-text-color-primary);
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>