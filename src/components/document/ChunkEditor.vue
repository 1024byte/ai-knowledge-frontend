<template>
  <el-dialog
    :model-value="visible"
    :title="`切片编辑: ${preview.fileName || ''}`"
    width="70%"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
    @open="loadChunks"
  >
    <div v-loading="loading" class="chunk-editor">
      <div class="chunk-editor-header">
        <span class="chunk-count">共 <strong>{{ chunks.length }}</strong> 个切片</span>
        <el-button type="primary" link @click="addChunk">
          <el-icon :size="16"><Plus /></el-icon>
          新增切片
        </el-button>
      </div>

      <div v-if="chunks.length === 0 && !loading" class="chunk-empty">
        <el-empty description="暂无切片数据" :image-size="80" />
      </div>

      <div class="chunk-list">
        <div
          v-for="(chunk, i) in chunks"
          :key="i"
          class="chunk-item"
        >
          <div class="chunk-header">
            <span class="chunk-index">#{{ i + 1 }}</span>
            <span class="chunk-context">{{ chunk.contextPrefix || '（无上下文）' }}</span>
            <el-tag v-if="chunk.metadata?.content_type" size="small" type="info">
              {{ chunk.metadata.content_type }}
            </el-tag>
            <span class="chunk-tokens">{{ chunk.tokenCount }} tokens</span>
          </div>

          <el-input
            :model-value="chunk.text"
            type="textarea"
            :rows="5"
            resize="vertical"
            @update:model-value="(val: string) => updateChunkText(i, val)"
          />

          <div class="chunk-footer">
            <el-button
              link
              type="primary"
              size="small"
              :disabled="i >= chunks.length - 1"
              @click="mergeChunks(i)"
            >
              与下一个合并
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              :disabled="chunks.length <= 1"
              @click="deleteChunk(i)"
            >
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('update:visible', false)">取消</el-button>
        <el-button @click="loadChunks" :loading="loading">刷新</el-button>
        <el-button type="primary" :loading="saving" :disabled="chunks.length === 0" @click="handleSave">
          保存切片
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { knowledgeManagementApi } from '@/api/knowledge-management'
import type { ChunkItem, ChunksPreviewResponse } from '@/types/knowledge-management'

const props = defineProps<{
  visible: boolean
  documentId: number
  vectorized: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'saved': []
}>()

const loading = ref(false)
const saving = ref(false)
const chunks = ref<ChunkItem[]>([])

const preview = reactive<ChunksPreviewResponse>({
  documentId: 0,
  fileName: '',
  totalChunks: 0,
  chunks: []
})

const loadChunks = async () => {
  loading.value = true
  try {
    const data = await knowledgeManagementApi.getChunks(props.documentId)
    preview.documentId = data.documentId
    preview.fileName = data.fileName
    preview.totalChunks = data.totalChunks
    chunks.value = data.chunks.map((c) => ({ ...c }))
  } catch {
    chunks.value = []
  } finally {
    loading.value = false
  }
}

const updateChunkText = (index: number, text: string) => {
  chunks.value[index] = {
    ...chunks.value[index],
    text,
    tokenCount: estimateTokens(text)
  }
}

const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 3)
}

const mergeChunks = (index: number) => {
  if (index >= chunks.value.length - 1) return
  const merged = {
    ...chunks.value[index],
    text: chunks.value[index].text + '\n\n' + chunks.value[index + 1].text,
    tokenCount: chunks.value[index].tokenCount + chunks.value[index + 1].tokenCount,
    contextPrefix: chunks.value[index].contextPrefix,
    metadata: { ...chunks.value[index].metadata }
  }
  chunks.value.splice(index, 2, merged)
}

const deleteChunk = (index: number) => {
  chunks.value.splice(index, 1)
}

const addChunk = () => {
  chunks.value.push({
    index: chunks.value.length,
    text: '',
    tokenCount: 0,
    contextPrefix: '',
    metadata: {}
  })
}

const doSave = (confirm: boolean) => {
  return knowledgeManagementApi.saveChunks(props.documentId, {
    chunks: chunks.value,
    confirm
  })
}

const confirmReslice = async (message?: string): Promise<boolean> => {
  try {
    await ElMessageBox.confirm(
      message || '文档已向量化，重新保存切片将清除向量化数据，需重新向量化，确定继续吗？',
      '保存确认',
      {
        type: 'warning',
        confirmButtonText: '确定保存',
        cancelButtonText: '取消'
      }
    )
    return true
  } catch {
    return false
  }
}

const handleSave = async () => {
  if (chunks.value.length === 0) {
    ElMessage.warning('切片列表不能为空')
    return
  }

  let confirm = false
  if (props.vectorized) {
    confirm = await confirmReslice()
    if (!confirm) return
  }

  saving.value = true
  try {
    await doSave(confirm)
    ElMessage.success('切片保存成功')
    emit('update:visible', false)
    emit('saved')
  } catch (err: any) {
    const message = err?.message || ''
    if (message.includes('已向量化')) {
      const confirmed = await confirmReslice(message)
      if (!confirmed) return
      try {
        await doSave(true)
        ElMessage.success('切片保存成功')
        emit('update:visible', false)
        emit('saved')
      } catch {
        // 重试失败，错误提示已由请求拦截器统一处理
      }
    }
    // 其他错误提示已由请求拦截器统一处理
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.chunk-editor {
  min-height: 300px;
}

.chunk-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.chunk-count {
  font-size: 14px;
  color: #64748b;
}

.chunk-empty {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.chunk-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.chunk-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  background: #ffffff;
  transition: border-color 0.2s;

  &:hover {
    border-color: #cbd5e1;
  }
}

.chunk-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.chunk-index {
  font-weight: 700;
  font-size: 13px;
  color: #3b82f6;
  min-width: 28px;
}

.chunk-context {
  font-size: 12px;
  color: #94a3b8;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chunk-tokens {
  font-size: 11px;
  color: #a78bfa;
  margin-left: auto;
}

.chunk-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>