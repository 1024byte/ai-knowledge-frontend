<template>
  <div class="rag-references">
    <div class="rag-header">
      <div class="rag-title">
        <h4>RAG 引用来源</h4>
        <p>展示本轮回答命中的知识片段</p>
      </div>
      <span class="rag-count">{{ searchResults.length }} 条</span>
    </div>

    <div class="rag-list">
      <div v-if="searchResults.length === 0" class="rag-empty">
        <el-icon :size="40"><DocumentCopy /></el-icon>
        <p>暂无引用来源</p>
        <span>提问后将在此处展示命中的知识片段</span>
      </div>

      <div
        v-for="(item, index) in searchResults"
        :key="index"
        class="rag-card"
      >
        <div class="rag-card-header">
          <span class="rag-card-title">{{ item.source || '未知来源' }}</span>
          <el-tag size="small" class="similarity-tag">
            相似度 {{ formatSimilarity(item.score) }}
          </el-tag>
        </div>
        <div class="rag-card-content">
          {{ item.content }}
        </div>
        <div class="rag-card-footer">
          <el-button
            text
            size="small"
            type="primary"
            class="view-full-btn"
            @click="openDetail(item)"
          >
            <el-icon :size="14"><FullScreen /></el-icon>
            <span>查看完整</span>
          </el-button>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      title="知识片段详情"
      width="560px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-if="selectedItem" class="detail-body">
        <div class="detail-meta">
          <div class="detail-meta-row">
            <span class="detail-label">来源文档</span>
            <span class="detail-value">{{ selectedItem.source || '未知来源' }}</span>
          </div>
          <div class="detail-meta-row">
            <span class="detail-label">相似度</span>
            <el-tag size="small" class="similarity-tag">
              {{ formatSimilarity(selectedItem.score) }}
            </el-tag>
          </div>
        </div>
        <div class="detail-content">{{ selectedItem.content }}</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { DocumentCopy, FullScreen } from '@element-plus/icons-vue'
import type { SearchResult } from '@/types/chat'

defineProps<{
  searchResults: SearchResult[]
}>()

const dialogVisible = ref(false)
const selectedItem = ref<SearchResult | null>(null)

const openDetail = (item: SearchResult) => {
  selectedItem.value = item
  dialogVisible.value = true
}

const formatSimilarity = (score?: number) => {
  if (score === undefined || score === null) return '--'
  return score.toFixed(2)
}
</script>

<style scoped lang="scss">
.rag-references {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}

.rag-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-shrink: 0;
}

.rag-title {
  h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;
  }

  p {
    margin: 4px 0 0;
    font-size: 12px;
    color: #94a3b8;
  }
}

.rag-count {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 10px;
  border-radius: 10px;
  white-space: nowrap;
}

.rag-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.rag-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #94a3b8;

  p {
    margin: 12px 0 0;
    font-size: 14px;
  }

  span {
    margin-top: 4px;
    font-size: 12px;
  }
}

.rag-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;

  &:last-child {
    margin-bottom: 0;
  }
}

.rag-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.rag-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.similarity-tag {
  background: #eff6ff;
  color: #3b82f6;
  border-color: #bfdbfe;
  flex-shrink: 0;
}

.rag-card-content {
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
  word-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 8;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rag-card-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid #e2e8f0;
}

.view-full-btn {
  font-size: 12px;
  padding: 2px 6px;
  color: #3b82f6;
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 8px;
}

.detail-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-label {
  font-size: 13px;
  color: #94a3b8;
  white-space: nowrap;
}

.detail-value {
  font-size: 13px;
  color: #334155;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-content {
  font-size: 14px;
  color: #334155;
  line-height: 1.8;
  word-wrap: break-word;
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px 0;
}
</style>