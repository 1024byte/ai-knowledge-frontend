<template>
  <div class="session-review">
    <div class="review-left">
      <div class="left-header">
        <span class="left-title">会话列表</span>
        <el-button
          text
          type="danger"
          size="small"
          :disabled="sessions.length === 0"
          @click="handleDeleteAll"
        >
          清空全部
        </el-button>
      </div>

      <div v-loading="sessionLoading" class="left-body">
        <el-empty v-if="!sessionLoading && sessions.length === 0" description="暂无历史会话" :image-size="80" />
        <div
          v-for="session in sessions"
          :key="session.sessionId"
          :class="['session-item', { active: session.sessionId === selectedSessionId }]"
          @click="selectSession(session.sessionId)"
        >
          <div class="session-info">
            <span class="session-preview">{{ session.preview || '（无内容）' }}</span>
            <span class="session-time">{{ formatSessionTime(session.lastActiveTime) }}</span>
          </div>
          <el-button
            text
            type="danger"
            size="small"
            @click.stop="handleDelete(session.sessionId)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <div class="review-right">
      <div v-if="selectedSessionId === null" class="right-empty">
        <el-empty description="请选择左侧会话查看详情" :image-size="120" />
      </div>

      <div v-else v-loading="historyLoading" class="right-content">
        <div class="right-header">
          <div class="right-title">会话详情</div>
          <div class="rating-box">
            <span class="rating-label">会话评价</span>
            <el-rate v-model="rating" @change="handleRatingChange" />
          </div>
        </div>

        <div class="messages">
          <div v-if="!historyLoading && history.length === 0" class="messages-empty">
            该会话暂无消息
          </div>
          <div v-for="(msg, idx) in history" :key="idx" :class="['message', msg.role]">
            <div class="message-role">
              {{ msg.role === 'user' ? '我' : 'AI 助手' }}
            </div>
            <div class="message-content" v-html="renderMarkdown(msg.content)"></div>
            <div class="message-meta">
              <span>{{ formatTime(msg.createTime) }}</span>
              <template v-if="msg.role === 'assistant' && msg.sources && msg.sources.length">
                <span class="source-divider">|</span>
                <span class="message-sources">来源：{{ msg.sources.join('、') }}</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { chatApi } from '@/api/chat'
import type { SessionInfo, HistoryMessage } from '@/types/chat'
import { renderMarkdown } from '@/utils/markdown'
import { formatTime } from '@/utils/format'
import dayjs from 'dayjs'

const sessions = ref<SessionInfo[]>([])
const sessionLoading = ref(false)

const selectedSessionId = ref<string | null>(null)
const history = ref<HistoryMessage[]>([])
const historyLoading = ref(false)

const rating = ref(0)

const ratingKey = (sessionId: string) => `session_rating_${sessionId}`

const formatSessionTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

const fetchSessions = async () => {
  sessionLoading.value = true
  try {
    sessions.value = await chatApi.getSessions()
  } catch {
    sessions.value = []
  } finally {
    sessionLoading.value = false
  }
}

const selectSession = async (sessionId: string) => {
  selectedSessionId.value = sessionId
  rating.value = Number(localStorage.getItem(ratingKey(sessionId)) || 0)

  historyLoading.value = true
  try {
    history.value = await chatApi.getHistory(sessionId)
  } catch {
    history.value = []
  } finally {
    historyLoading.value = false
  }
}

const handleRatingChange = (val: number) => {
  if (!selectedSessionId.value) return
  localStorage.setItem(ratingKey(selectedSessionId.value), String(val))
  ElMessage.success('评价已保存')
}

const handleDelete = async (sessionId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除该会话吗？删除后不可恢复。', '删除会话', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await chatApi.deleteSession(sessionId)
    ElMessage.success('删除成功')
    sessions.value = sessions.value.filter((s) => s.sessionId !== sessionId)
    if (selectedSessionId.value === sessionId) {
      selectedSessionId.value = null
      history.value = []
      rating.value = 0
    }
  } catch {
    // 取消删除
  }
}

const handleDeleteAll = async () => {
  try {
    await ElMessageBox.confirm('确定要清空全部历史会话吗？删除后不可恢复。', '清空确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await chatApi.deleteAllSessions()
    ElMessage.success('清空成功')
    sessions.value = []
    selectedSessionId.value = null
    history.value = []
    rating.value = 0
  } catch {
    // 取消清空
  }
}

onMounted(() => {
  fetchSessions()
})
</script>

<style scoped lang="scss">
.session-review {
  display: flex;
  height: 100%;
  gap: 16px;
}

.review-left {
  width: 320px;
  min-width: 320px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.left-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;

  .left-title {
    font-size: 14px;
    font-weight: 600;
    color: #334155;
  }
}

.left-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
  }

  &.active {
    background: rgba(99, 102, 241, 0.1);
  }
}

.session-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.session-preview {
  font-size: 13px;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-time {
  font-size: 12px;
  color: #94a3b8;
}

.review-right {
  flex: 1;
  min-width: 0;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.right-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.right-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.right-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;
  gap: 8px;
}

.right-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.rating-box {
  display: flex;
  align-items: center;
  gap: 8px;

  .rating-label {
    font-size: 13px;
    color: #64748b;
  }
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.messages-empty {
  text-align: center;
  color: #94a3b8;
  padding: 40px 0;
}

.message {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 8px;

  &.user {
    background: #eff6ff;

    .message-role {
      color: #2563eb;
    }
  }

  &.assistant {
    background: #f8fafc;

    .message-role {
      color: #059669;
    }
  }
}

.message-role {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}

.message-content {
  font-size: 14px;
  color: #1e293b;
  line-height: 1.6;
  word-break: break-word;

  :deep(p) {
    margin: 0 0 8px;
  }

  :deep(p:last-child) {
    margin-bottom: 0;
  }
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
  flex-wrap: wrap;
}

.source-divider {
  color: #cbd5e1;
}

.message-sources {
  color: #64748b;
}
</style>