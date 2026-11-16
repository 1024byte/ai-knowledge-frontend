<template>
  <el-dialog
    v-model="visible"
    title="拆分片段"
    width="720px"
    top="6vh"
    :close-on-click-modal="false"
    destroy-on-close
    @open="initForm"
  >
    <div class="split-origin">
      <div class="split-origin-label">原片段内容</div>
      <div class="split-origin-text">{{ chunk?.text || '' }}</div>
    </div>

    <div class="split-segments">
      <div class="split-segments-label">拆分后的片段（至少 2 段）</div>

      <div v-for="(seg, i) in texts" :key="i" class="split-segment-item">
        <span class="split-segment-index">#{{ i + 1 }}</span>
        <el-input
          v-model="texts[i]"
          type="textarea"
          :rows="4"
          resize="vertical"
          placeholder="请输入拆分后的文本"
        />
        <el-button
          v-if="texts.length > 2"
          link
          type="danger"
          class="split-segment-remove"
          @click="removeSegment(i)"
        >
          移除
        </el-button>
      </div>

      <el-button type="primary" link @click="addSegment">
        <el-icon :size="14"><Plus /></el-icon>
        添加一段
      </el-button>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">拆分</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { chunkApi } from '@/api/knowledge-chunk'
import type { SavedChunkItem } from '@/types/knowledge-chunk'

const visible = defineModel<boolean>({ required: true })

const props = defineProps<{
  documentId: number
  chunk: SavedChunkItem | null
}>()

const emit = defineEmits<{
  saved: []
}>()

const saving = ref(false)
const texts = ref<string[]>(['', ''])

const initForm = () => {
  texts.value = ['', '']
}

const addSegment = () => {
  texts.value.push('')
}

const removeSegment = (index: number) => {
  if (texts.value.length <= 2) return
  texts.value.splice(index, 1)
}

const handleSave = async () => {
  if (!props.chunk) return

  if (texts.value.length < 2) {
    ElMessage.warning('拆分至少需要 2 段文本')
    return
  }
  if (texts.value.some((t) => !t || !t.trim())) {
    ElMessage.warning('存在空白片段，请补充内容或移除该段')
    return
  }

  saving.value = true
  try {
    await chunkApi.split({
      documentId: props.documentId,
      chunkId: props.chunk.id,
      texts: texts.value.map((t) => t.trim())
    })
    ElMessage.success('拆分成功')
    visible.value = false
    emit('saved')
  } catch {
    // 错误提示已由请求拦截器统一处理
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.split-origin {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.split-origin-label {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 6px;
}

.split-origin-text {
  font-size: 13px;
  color: #475569;
  line-height: 1.6;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.split-segments {
  max-height: 44vh;
  overflow-y: auto;
  padding-right: 8px;
}

.split-segments-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 12px;
}

.split-segment-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}

.split-segment-index {
  font-weight: 700;
  font-size: 13px;
  color: #6366f1;
  min-width: 28px;
  line-height: 32px;
}

.split-segment-remove {
  margin-top: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>