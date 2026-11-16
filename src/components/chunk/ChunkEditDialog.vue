<template>
  <el-dialog
    v-model="visible"
    title="编辑片段"
    width="720px"
    top="6vh"
    :close-on-click-modal="false"
    destroy-on-close
    @open="initForm"
  >
    <el-form label-width="110px" class="chunk-edit-form">
      <el-form-item label="切片文本">
        <el-input
          v-model="form.text"
          type="textarea"
          :rows="8"
          resize="vertical"
          placeholder="请输入片段文本"
        />
      </el-form-item>

      <el-form-item label="上下文路径">
        <el-input v-model="form.contextPrefix" placeholder="如：第一章 > 1.1 概述" />
      </el-form-item>

      <el-form-item label="内容类型">
        <el-select v-model="form.contentType" placeholder="请选择内容类型" clearable style="width: 240px">
          <el-option label="文本" value="text" />
          <el-option label="代码" value="code" />
          <el-option label="表格" value="table" />
        </el-select>
      </el-form-item>

      <el-form-item label="父级段落全文">
        <el-input
          v-model="form.parentText"
          type="textarea"
          :rows="4"
          resize="vertical"
          placeholder="父级段落全文（可选）"
        />
      </el-form-item>

      <div class="parent-range">
        <el-form-item label="父级起始索引">
          <el-input-number
            v-model="form.parentStart"
            :min="0"
            :max="999999"
            :controls="false"
            placeholder="起始 chunk 索引"
          />
        </el-form-item>
        <el-form-item label="父级结束索引">
          <el-input-number
            v-model="form.parentEnd"
            :min="0"
            :max="999999"
            :controls="false"
            placeholder="结束 chunk 索引"
          />
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { chunkApi } from '@/api/knowledge-chunk'
import type { EditChunkRequest, SavedChunkItem } from '@/types/knowledge-chunk'

const visible = defineModel<boolean>({ required: true })

const props = defineProps<{
  chunk: SavedChunkItem | null
}>()

const emit = defineEmits<{
  saved: []
}>()

interface ChunkEditForm {
  text: string
  contextPrefix: string
  contentType: string
  parentText: string
  parentStart: number | undefined
  parentEnd: number | undefined
}

const saving = ref(false)

const original: ChunkEditForm = {
  text: '',
  contextPrefix: '',
  contentType: '',
  parentText: '',
  parentStart: undefined,
  parentEnd: undefined
}

const form = reactive<ChunkEditForm>({
  text: '',
  contextPrefix: '',
  contentType: '',
  parentText: '',
  parentStart: undefined,
  parentEnd: undefined
})

const parseIndex = (value: string | undefined): number | undefined => {
  if (value == null || value === '') return undefined
  const num = Number(value)
  return Number.isNaN(num) ? undefined : num
}

const initForm = () => {
  const metadata = props.chunk?.metadata || {}
  const base: ChunkEditForm = {
    text: props.chunk?.text ?? '',
    contextPrefix: props.chunk?.contextPrefix ?? '',
    contentType: metadata.content_type ?? '',
    parentText: metadata.parent_text ?? '',
    parentStart: parseIndex(metadata.parent_start),
    parentEnd: parseIndex(metadata.parent_end)
  }
  Object.assign(original, base)
  Object.assign(form, base)
}

const buildPayload = (): EditChunkRequest => {
  const payload: EditChunkRequest = {}
  if (form.text !== original.text) payload.text = form.text
  if (form.contextPrefix !== original.contextPrefix) payload.contextPrefix = form.contextPrefix
  if (form.contentType !== original.contentType) payload.contentType = form.contentType || null
  if (form.parentText !== original.parentText) payload.parentText = form.parentText
  if (form.parentStart !== original.parentStart) payload.parentStart = form.parentStart ?? null
  if (form.parentEnd !== original.parentEnd) payload.parentEnd = form.parentEnd ?? null
  return payload
}

const handleSave = async () => {
  if (!props.chunk) return

  const payload = buildPayload()
  if (Object.keys(payload).length === 0) {
    ElMessage.warning('没有检测到任何修改')
    return
  }
  if (payload.text !== undefined && !payload.text.trim()) {
    ElMessage.warning('片段文本不能为空')
    return
  }

  saving.value = true
  try {
    await chunkApi.update(props.chunk.id, payload)
    ElMessage.success('片段保存成功')
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
.chunk-edit-form {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 8px;
}

.parent-range {
  display: flex;
  gap: 16px;

  .el-form-item {
    flex: 1;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>