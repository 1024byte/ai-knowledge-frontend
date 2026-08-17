<template>
  <div class="document-content-page">
    <el-container class="page-container">
      <el-header class="page-header">
        <div class="header-content">
          <div class="header-title">
            <el-icon :size="20"><document /></el-icon>
            <span class="file-name">{{ fileName || '文档内容' }}</span>
          </div>
          <div class="header-actions">
            <el-tag v-if="fileType" size="small" type="info">{{ displayFileType }}</el-tag>
            <el-button
              v-if="!isTextPreview"
              text
              size="small"
              @click="handleDownload"
            >
              <el-icon :size="14"><download /></el-icon>
              <span>下载</span>
            </el-button>
          </div>
        </div>
      </el-header>

      <el-main class="page-main">
        <div v-if="loading" class="loading-state">
          <el-icon class="is-loading" :size="32"><loading /></el-icon>
          <span>加载文档内容中...</span>
        </div>

        <div v-else-if="error" class="error-state">
          <el-icon :size="32" color="var(--el-color-danger)"><warning-filled /></el-icon>
          <p>{{ error }}</p>
          <el-button type="primary" @click="initContent">重新加载</el-button>
        </div>

        <div v-else-if="isPdf" class="pdf-wrapper">
          <iframe
            :src="contentUrl"
            class="pdf-iframe"
            frameborder="0"
          />
        </div>

        <div v-else-if="isImage" class="image-wrapper">
          <img
            :src="contentUrl"
            :alt="fileName"
            class="preview-image"
          />
        </div>

        <div v-else-if="isTextPreview" class="content-wrapper">
          <div class="markdown-body" v-html="renderedContent"></div>
        </div>

        <div v-else class="unsupported-state">
          <el-icon :size="48" color="var(--el-text-color-placeholder)"><document /></el-icon>
          <p>该文件类型不支持在线预览</p>
          <el-button type="primary" @click="handleDownload">
            <el-icon :size="16"><download /></el-icon>
            <span>下载文件</span>
          </el-button>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Document, Loading, WarningFilled, Download } from '@element-plus/icons-vue'
import { documentApi } from '@/api/document'
import { renderMarkdown } from '@/utils/markdown'

const route = useRoute()

const documentId = computed(() => {
  const id = route.params.id
  return id ? Number(id) : 0
})

const fileName = computed(() => {
  return (route.query.fileName as string) || ''
})

const fileType = computed(() => {
  return (route.query.fileType as string) || ''
})

const displayFileType = computed(() => {
  return fileType.value || '未知'
})

const fileExtension = computed(() => {
  if (fileType.value) return fileType.value.toLowerCase()
  if (fileName.value) {
    const dotIndex = fileName.value.lastIndexOf('.')
    if (dotIndex !== -1) {
      return fileName.value.substring(dotIndex + 1).toLowerCase()
    }
  }
  return ''
})

const isPdf = computed(() => fileExtension.value === 'pdf')
const isImage = computed(() => {
  const imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg']
  return imageTypes.includes(fileExtension.value)
})
const isTextPreview = computed(() => {
  const textTypes = ['txt', 'md', 'markdown', 'json', 'xml', 'csv', 'log', 'yaml', 'yml']
  return textTypes.includes(fileExtension.value)
})

const contentUrl = computed(() => {
  return documentApi.getDocumentContentUrl(documentId.value)
})

const loading = ref(false)
const error = ref('')
const content = ref('')

const renderedContent = computed(() => {
  if (!content.value) return ''
  return renderMarkdown(content.value)
})

const fetchTextContent = async () => {
  if (!documentId.value) return

  loading.value = true
  error.value = ''

  try {
    const response = await fetch(contentUrl.value)
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || `请求失败 (${response.status})`)
    }
    content.value = await response.text()
  } catch (err: any) {
    error.value = err?.message || '加载文档内容失败'
    content.value = ''
  } finally {
    loading.value = false
  }
}

const handleDownload = () => {
  const a = document.createElement('a')
  a.href = contentUrl.value
  a.download = fileName.value || 'document'
  a.click()
}

const initContent = () => {
  if (isTextPreview.value) {
    fetchTextContent()
  }
}

onMounted(() => {
  initContent()
})
</script>

<style scoped lang="scss">
.document-content-page {
  height: 100vh;
  overflow: hidden;
}

.page-container {
  height: 100%;
}

.page-header {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  padding: 0 20px;
  height: 56px;

  .header-content {
    display: flex;
    align-items: center;
    height: 100%;
    gap: 16px;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;

    .file-name {
      font-size: 16px;
      font-weight: 500;
      color: var(--el-text-color-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.page-main {
  padding: 0;
  overflow: hidden;
  background: var(--el-bg-color-page);
}

.loading-state,
.error-state,
.unsupported-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.error-state {
  p {
    color: var(--el-color-danger);
    margin: 0;
  }
}

.pdf-wrapper {
  height: 100%;
  width: 100%;

  .pdf-iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
}

.image-wrapper {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow: auto;

  .preview-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 4px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }
}

.content-wrapper {
  height: 100%;
  overflow-y: auto;
  padding: 32px 48px;
  max-width: 900px;
  margin: 0 auto;
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
</style>