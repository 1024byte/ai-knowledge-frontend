<template>
  <div class="document-sidebar">
    <div class="sidebar-header">
      <span class="title">文档管理</span>
    </div>

    <div class="sidebar-body">
      <el-button
        type="primary"
        class="upload-btn"
        @click="showUploadDialog = true"
      >
        <el-icon><upload /></el-icon>
        上传文档
      </el-button>

      <div class="document-list">
        <div v-if="loading" class="loading-state">
          <el-icon class="is-loading" :size="24"><loading /></el-icon>
          <p>加载中...</p>
        </div>

        <div v-else-if="documents.length === 0" class="empty-state">
          <el-icon :size="32" color="var(--el-text-color-placeholder)"><document /></el-icon>
          <p>暂无文档</p>
        </div>

        <div v-else class="list-content">
          <div class="list-header">
            <span>历史文档</span>
            <el-button text size="small" @click="refreshList">
              <el-icon><refresh /></el-icon>
            </el-button>
          </div>

          <div class="list-items">
            <div
              v-for="(item, index) in documents"
              :key="index"
              class="doc-item"
            >
              <el-icon class="file-icon" :size="18">
                <document />
              </el-icon>
              <div class="file-info">
                <span class="file-name" :title="item.filename">{{ item.filename }}</span>
                <div class="file-meta">
                  <el-tag size="small" type="info" class="type-tag">{{ item.fileType }}</el-tag>
                  <span class="meta-text">{{ formatFileSize(item.fileSize) }}</span>
                  <span class="meta-text">{{ item.chunkCount }} 块</span>
                </div>
                <span class="file-time">{{ formatUploadTime(item.uploadTime) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <upload-dialog
      v-model="showUploadDialog"
      @success="handleUploadSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Upload, Document, Refresh, Loading } from '@element-plus/icons-vue'
import { useDocumentStore } from '@/stores/document'
import { formatFileSize } from '@/utils/format'
import UploadDialog from '@/components/document/UploadDialog.vue'
import dayjs from 'dayjs'

const showUploadDialog = ref(false)

const documentStore = useDocumentStore()
const { documents, loading } = storeToRefs(documentStore)

const formatUploadTime = (timestamp: number) => {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm')
}

const refreshList = () => {
  documentStore.fetchDocuments()
}

const handleUploadSuccess = () => {
  documentStore.fetchDocuments()
}

onMounted(() => {
  documentStore.fetchDocuments()
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

.sidebar-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color);

  .title {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-btn {
  width: 100%;
}

.document-list {
  flex: 1;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: var(--el-text-color-secondary);

  p {
    margin-top: 8px;
    font-size: 13px;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: var(--el-text-color-secondary);

  p {
    margin-top: 8px;
    font-size: 13px;
  }
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;

  span {
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-secondary);
  }
}

.list-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.doc-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  transition: background 0.2s;

  &:hover {
    background: var(--el-fill-color);
  }

  .file-icon {
    color: var(--el-color-primary);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .file-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .file-name {
      font-size: 13px;
      color: var(--el-text-color-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;

      .type-tag {
        font-size: 10px;
        padding: 0 4px;
        height: 18px;
        line-height: 18px;
      }

      .meta-text {
        font-size: 11px;
        color: var(--el-text-color-secondary);
      }
    }

    .file-time {
      font-size: 11px;
      color: var(--el-text-color-placeholder);
    }
  }
}
</style>
