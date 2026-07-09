<template>
  <el-dialog
    v-model="visible"
    :title="`上传文档 - ${category || '默认分类'}`"
    width="600px"
    :close-on-click-modal="false"
  >
    <el-form label-width="80px">
      <el-form-item label="上传文件">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :file-list="fileList"
          :accept="acceptTypes"
          :limit="5"
          drag
          multiple
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            拖拽文件到此处或 <em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              支持 txt、md、pdf、docx、xlsx、pptx、jpg/png 格式，单个文件不超过 10MB
            </div>
          </template>
        </el-upload>
      </el-form-item>

      <el-form-item v-if="isUploading">
        <el-progress :percentage="uploadProgress" :stroke-width="20" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button
        type="primary"
        :loading="isUploading"
        :disabled="fileList.length === 0"
        @click="handleUpload"
      >
        上传
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { useUpload } from '@/composables/useUpload'
import type { UploadFile } from 'element-plus'

const visible = defineModel<boolean>()
const props = defineProps<{
  category?: string
}>()
const emit = defineEmits(['success'])

const acceptTypes = '.txt,.md,.pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png'
const fileList = ref<UploadFile[]>([])

const { uploadFile, uploadProgress, isUploading } = useUpload()

const handleFileChange = (file: UploadFile, files: UploadFile[]) => {
  fileList.value = files
}

const handleFileRemove = (file: UploadFile, files: UploadFile[]) => {
  fileList.value = files
}

const handleUpload = async () => {
  if (fileList.value.length === 0) {
    ElMessage.warning('请选择要上传的文件')
    return
  }

  try {
    for (const file of fileList.value) {
      if (file.raw) {
        await uploadFile(file.raw, props.category)
      }
    }

    ElMessage.success('上传成功')
    emit('success')
    handleCancel()
  } catch (error: any) {
    ElMessage.error(error.message || '上传失败')
  }
}

const handleCancel = () => {
  visible.value = false
  fileList.value = []
}
</script>

<style scoped lang="scss">
.el-upload__tip {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-top: 7px;
}
</style>
