<template>
  <el-dialog
    :model-value="visible"
    :title="`文档预览: ${fileName || ''}`"
    width="80%"
    top="6vh"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
    @open="loadContent"
  >
    <div v-loading="loading" class="document-preview">
      <div v-if="error" class="preview-error">
        <el-icon :size="40" color="var(--el-color-danger)"><WarningFilled /></el-icon>
        <p>{{ error }}</p>
        <el-button type="primary" @click="loadContent">重新加载</el-button>
      </div>

      <div v-else-if="!loading && !content" class="preview-empty">
        <el-empty description="暂无文档内容" :image-size="80" />
      </div>

      <div v-else class="markdown-body" v-html="renderedContent"></div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('update:visible', false)">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'
import { knowledgeManagementApi } from '@/api/knowledge-management'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{
  visible: boolean
  documentId: number
}>()

defineEmits<{
  'update:visible': [value: boolean]
}>()

const loading = ref(false)
const error = ref('')
const fileName = ref('')
const content = ref('')

const renderedContent = computed(() => {
  if (!content.value) return ''
  return renderMarkdown(content.value)
})

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
</script>

<style scoped lang="scss">
.document-preview {
  min-height: 400px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 8px 12px;
}

.preview-error {
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

.preview-empty {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.markdown-body {
  font-size: 15px;
  line-height: 1.8;
  color: var(--el-text-color-primary);

  :deep(h1) {
    font-size: 28px;
    font-weight: 600;
    margin: 24px 0 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--el-border-color-light);
  }

  :deep(h2) {
    font-size: 22px;
    font-weight: 600;
    margin: 20px 0 12px;
  }

  :deep(h3) {
    font-size: 18px;
    font-weight: 600;
    margin: 16px 0 10px;
  }

  :deep(h4) {
    font-size: 16px;
    font-weight: 600;
    margin: 14px 0 8px;
  }

  :deep(h5),
  :deep(h6) {
    font-size: 15px;
    font-weight: 600;
    margin: 12px 0 8px;
  }

  :deep(p) {
    margin: 8px 0;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 24px;
    margin: 8px 0;
  }

  :deep(li) {
    margin: 4px 0;
  }

  :deep(blockquote) {
    margin: 12px 0;
    padding: 8px 16px;
    border-left: 4px solid var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    color: var(--el-text-color-regular);
  }

  :deep(code) {
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 13px;
    background: var(--el-color-primary-light-9);
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--el-color-danger);
  }

  :deep(pre) {
    margin: 12px 0;
    padding: 16px;
    background: #1e1e1e;
    border-radius: 8px;
    overflow-x: auto;

    code {
      background: transparent;
      color: #d4d4d4;
      padding: 0;
      font-size: 13px;
      line-height: 1.6;
    }
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 14px;
  }

  :deep(th),
  :deep(td) {
    border: 1px solid var(--el-border-color);
    padding: 8px 12px;
    text-align: left;
  }

  :deep(th) {
    background: var(--el-fill-color-light);
    font-weight: 600;
  }

  :deep(a) {
    color: var(--el-color-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid var(--el-border-color-light);
    margin: 20px 0;
  }

  :deep(img) {
    max-width: 100%;
    border-radius: 4px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>