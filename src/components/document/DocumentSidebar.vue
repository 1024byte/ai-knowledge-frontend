<template>
  <div class="document-sidebar">
    <div class="sidebar-body">
      <div class="panel folders-panel">
        <div class="panel-header">
          <span class="panel-title">文件夹</span>
          <el-button text size="small" @click="showCreateDialog = true">
            <el-icon :size="14"><plus /></el-icon>
          </el-button>
        </div>
        <div class="panel-content">
          <el-collapse v-model="activeCollapse">
            <el-collapse-item name="folders">
              <template #title>
                <div class="collapse-title">
                  <el-icon><folder /></el-icon>
                  <span>全部文件夹</span>
                  <el-tag size="small" type="info" class="count-tag">{{ categories.length }}</el-tag>
                </div>
              </template>
              <div v-if="categories.length === 0" class="empty-folders">
                <p>暂无文件夹，点击 + 创建</p>
              </div>
              <div v-else class="folder-list">
                <div
                  v-for="cat in categories"
                  :key="cat"
                  :class="['folder-item', { active: selectedCategory === cat }]"
                  @click="handleSelectCategory(cat)"
                  @contextmenu.prevent="handleFolderContextMenu($event, cat)"
                >
                  <el-icon class="folder-icon"><folder /></el-icon>
                  <span class="folder-name">{{ cat }}</span>
                  <el-button
                    text
                    size="small"
                    class="upload-arrow"
                    @click.stop="openUploadDialog(cat)"
                  >
                    <el-icon :size="14"><upload /></el-icon>
                  </el-button>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>

      <div class="panel-divider" />

      <div class="panel files-panel">
        <div class="panel-header">
          <span class="panel-title">
            {{ selectedCategory ? `${selectedCategory} - 文件` : '文件列表' }}
          </span>
          <el-button
            v-if="selectedCategory"
            text
            size="small"
            @click="openUploadDialog(selectedCategory)"
          >
            <el-icon :size="14"><upload /></el-icon>
          </el-button>
          <el-button text size="small" @click="refreshFileList">
            <el-icon :size="14"><refresh /></el-icon>
          </el-button>
        </div>
        <div class="panel-content">
          <div v-if="filesLoading" class="loading-state">
            <el-icon class="is-loading" :size="20"><loading /></el-icon>
            <span>加载中...</span>
          </div>
          <div v-else-if="categoryFiles.length === 0" class="empty-state">
            <el-icon :size="28" color="var(--el-text-color-placeholder)"><document /></el-icon>
            <p>{{ selectedCategory ? '该文件夹下暂无文件' : '请选择文件夹查看文件' }}</p>
          </div>
          <div v-else class="file-list">
            <div
              v-for="(item, index) in categoryFiles"
              :key="index"
              :class="['file-item', { 'is-processing': item.status === 'processing' }]"
              @dblclick="handleFileClick(item)"
            >
              <el-icon v-if="item.status === 'processing'" class="file-icon is-spinning" :size="16"><loading /></el-icon>
              <el-icon v-else class="file-icon" :size="16"><document /></el-icon>
              <div class="file-info">
                <span class="file-name" :title="item.fileName">{{ item.fileName }}</span>
                <div class="file-meta">
                  <el-tag size="small" type="info" class="type-tag">{{ item.fileType }}</el-tag>
                  <span class="meta-text">{{ formatFileSize(item.fileSize) }}</span>
                  <span v-if="item.status === 'active'" class="meta-text">{{ item.chunkCount }} 块</span>
                  <el-tag
                    v-if="item.status === 'processing'"
                    size="small"
                    type="warning"
                    class="status-tag"
                  >
                    <el-icon class="is-spinning" :size="10"><loading /></el-icon>
                    处理中
                  </el-tag>
                  <el-tag
                    v-else-if="item.status === 'active'"
                    size="small"
                    type="success"
                    class="status-tag"
                  >
                    已完成
                  </el-tag>
                  <el-tooltip
                    v-else-if="item.status === 'failed'"
                    :content="item.errorMessage || '处理失败'"
                    placement="top"
                  >
                    <el-tag size="small" type="danger" class="status-tag">失败</el-tag>
                  </el-tooltip>
                </div>
                <span class="file-time">{{ formatUploadTime(item.uploadTime) }}</span>
              </div>
              <el-button text size="small" class="delete-file-btn" @click.stop="handleDeleteDocument(item)">
                <el-icon :size="14"><delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="showCreateDialog"
      title="创建文件夹"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="createForm.name" placeholder="请输入文件夹名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入文件夹描述（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="!createForm.name.trim()"
          :loading="creating"
          @click="handleCreateCategory"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <upload-dialog
      v-model="showUploadDialog"
      :category="uploadCategory || undefined"
      @success="handleUploadSuccess"
    />

    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
    >
      <div class="context-menu-item danger" @click="handleDeleteCategory(contextMenu.category!)">
        <el-icon><delete /></el-icon>
        <span>删除文件夹</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Folder, Upload, Document, Refresh, Loading, Delete
} from '@element-plus/icons-vue'
import { documentApi } from '@/api/document'
import { useDocumentStore } from '@/stores/document'
import { formatFileSize } from '@/utils/format'
import UploadDialog from '@/components/document/UploadDialog.vue'
import { useDocumentTracker } from '@/composables/useDocumentTracker'
import dayjs from 'dayjs'
import type { DocumentFileRecord } from '@/types/document'

const documentStore = useDocumentStore()
const { categories } = storeToRefs(documentStore)
const router = useRouter()

const { onStatusChange, trackDocument, getDocStatus, cleanupAll } = useDocumentTracker()

const activeCollapse = ref<string[]>(['folders'])
const selectedCategory = ref('')
const showCreateDialog = ref(false)
const showUploadDialog = ref(false)
const uploadCategory = ref('')
const creating = ref(false)
const filesLoading = ref(false)
const createForm = reactive({ name: '', description: '' })
const categoryFiles = ref<DocumentFileRecord[]>([])

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  category: '' as string | null
})

const formatUploadTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

const mergeTrackingStatus = (files: DocumentFileRecord[]) => {
  return files.map((file) => {
    const tracked = getDocStatus(file.id)
    if (tracked) {
      return { ...file, status: tracked.status, errorMessage: tracked.errorMessage }
    }
    if (!file.status) {
      return { ...file, status: 'active', errorMessage: null }
    }
    return file
  })
}

const fetchCategoryFiles = async (category: string) => {
  filesLoading.value = true
  try {
    const files = await documentApi.getCategoryFiles(category)
    categoryFiles.value = mergeTrackingStatus(files)
  } catch (error) {
    console.error('Fetch category files error:', error)
    categoryFiles.value = []
  } finally {
    filesLoading.value = false
  }
}

const handleSelectCategory = (cat: string) => {
  selectedCategory.value = cat
  fetchCategoryFiles(cat)
}

const refreshFileList = () => {
  if (selectedCategory.value) {
    fetchCategoryFiles(selectedCategory.value)
  }
}

const openUploadDialog = (cat: string) => {
  uploadCategory.value = cat
  showUploadDialog.value = true
}

const handleUploadSuccess = (metaId: number) => {
  trackDocument(metaId)
  if (selectedCategory.value) {
    fetchCategoryFiles(selectedCategory.value)
  }
}

const handleFileClick = (item: DocumentFileRecord) => {
  const resolved = router.resolve({
    name: 'DocumentContent',
    params: { id: item.id },
    query: {
      fileName: item.fileName,
      fileType: item.fileType
    }
  })
  window.open(resolved.href, '_blank')
}

const handleDeleteDocument = async (item: DocumentFileRecord) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除文件「${item.fileName}」吗？删除后不可恢复。`,
      '删除文件',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    await documentApi.deleteDocument(item.id)
    ElMessage.success('删除成功')
    if (selectedCategory.value) {
      fetchCategoryFiles(selectedCategory.value)
    }
  } catch {
    // 用户取消或删除失败
  }
}

const handleCreateCategory = async () => {
  if (!createForm.name.trim()) return
  creating.value = true
  try {
    await documentStore.createCategory(createForm.name.trim(), createForm.description.trim() || undefined)
    ElMessage.success('文件夹创建成功')
    showCreateDialog.value = false
    createForm.name = ''
    createForm.description = ''
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.message || '创建失败')
  } finally {
    creating.value = false
  }
}

const handleDeleteCategory = async (name: string) => {
  contextMenu.visible = false
  try {
    await ElMessageBox.confirm(
      `确定要删除文件夹「${name}」吗？仅当文件夹下没有文档时才可删除。`,
      '删除文件夹',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    await documentStore.deleteCategory(name)
    ElMessage.success('删除成功')
    if (selectedCategory.value === name) {
      selectedCategory.value = ''
      categoryFiles.value = []
    }
  } catch {
    // 用户取消或删除失败
  }
}

const handleFolderContextMenu = (e: MouseEvent, cat: string) => {
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.category = cat
}

const handleClickOutside = () => {
  contextMenu.visible = false
}

onStatusChange.value = () => {
  if (selectedCategory.value) {
    fetchCategoryFiles(selectedCategory.value)
  }
}

onMounted(() => {
  documentStore.fetchCategories()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  cleanupAll()
})
</script>

<style scoped lang="scss">
.document-sidebar {
  width: 280px;
  height: 100%;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.is-spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.sidebar-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.folders-panel {
  flex: 0 0 50%;
}

.panel-divider {
  height: 1px;
  background: var(--el-border-color);
  flex-shrink: 0;
}

.files-panel {
  flex: 0 0 calc(50% - 1px);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;

  .panel-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-secondary);
  }
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px;
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;

  .count-tag {
    font-size: 10px;
    padding: 0 4px;
    height: 16px;
    line-height: 16px;
  }
}

:deep(.el-collapse) {
  border: none;
}

:deep(.el-collapse-item__header) {
  height: 36px;
  line-height: 36px;
  font-size: 13px;
  border-bottom: none;
  background: transparent;
}

:deep(.el-collapse-item__wrap) {
  border-bottom: none;
  background: transparent;
}

:deep(.el-collapse-item__content) {
  padding-bottom: 0;
}

.empty-folders {
  text-align: center;
  padding: 16px 0;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

.folder-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &.active {
    background: var(--el-color-primary-light-9);

    .folder-icon {
      color: var(--el-color-primary);
    }

    .folder-name {
      color: var(--el-color-primary);
      font-weight: 500;
    }
  }

  .folder-icon {
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
  }

  .folder-name {
    flex: 1;
    font-size: 13px;
    color: var(--el-text-color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .upload-arrow {
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover .upload-arrow {
    opacity: 1;
  }
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 32px 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
  color: var(--el-text-color-secondary);

  p {
    margin-top: 8px;
    font-size: 12px;
  }
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
}

.file-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
  transition: background 0.2s;
  cursor: pointer;

  &.is-processing {
    background: var(--el-color-warning-light-9);
    cursor: default;
  }

  &:hover {
    background: var(--el-fill-color-light);
  }

  .file-icon {
    color: var(--el-color-primary);
    flex-shrink: 0;
    margin-top: 2px;

    &.is-spinning {
      color: var(--el-color-warning);
    }
  }

  .file-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;

    .file-name {
      font-size: 12px;
      color: var(--el-text-color-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-meta {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;

      .type-tag {
        font-size: 10px;
        padding: 0 3px;
        height: 16px;
        line-height: 16px;
      }

      .status-tag {
        font-size: 10px;
        padding: 0 4px;
        height: 18px;
        line-height: 18px;

        .el-icon {
          margin-right: 2px;
        }
      }

      .meta-text {
        font-size: 10px;
        color: var(--el-text-color-secondary);
      }
    }

    .file-time {
      font-size: 10px;
      color: var(--el-text-color-placeholder);
    }
  }

  .delete-file-btn {
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.2s;
    color: var(--el-text-color-secondary);
  }

  &:hover .delete-file-btn {
    opacity: 1;
  }
}

.context-menu {
  position: fixed;
  z-index: 9999;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 4px 0;
  box-shadow: var(--el-box-shadow-light);
  min-width: 140px;

  .context-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 13px;
    cursor: pointer;
    color: var(--el-text-color-regular);
    transition: background 0.2s;

    &:hover {
      background: var(--el-fill-color-light);
    }

    &.danger {
      color: var(--el-color-danger);

      &:hover {
        background: var(--el-color-danger-light-9);
      }
    }
  }
}
</style>