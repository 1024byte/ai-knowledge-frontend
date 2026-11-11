<template>
  <div class="chat-container">
    <div class="chat-topbar">
      <div class="topbar-left">
        <el-select
          v-model="chatModel"
          placeholder="DeepSeek 聊天模型"
          size="default"
          class="topbar-select"
        >
          <el-option label="DeepSeek-V3" value="deepseek-v3" />
          <el-option label="DeepSeek-R1" value="deepseek-r1" />
        </el-select>
        <el-select
          v-model="embeddingModel"
          placeholder="百炼知识片段向量模型"
          size="default"
          class="topbar-select"
        >
          <el-option label="text-embedding-v3" value="text-embedding-v3" />
          <el-option label="text-embedding-v4" value="text-embedding-v4" />
        </el-select>
      </div>

      <div class="topbar-center">
        <div class="param-item">
          <label>召回数量</label>
          <el-input-number
            v-model="topK"
            :min="1"
            :max="20"
            :step="1"
            size="default"
            class="param-number"
          />
        </div>
        <div class="param-item param-slider">
          <label>相似度</label>
          <el-slider
            v-model="similarity"
            :min="0"
            :max="1"
            :step="0.01"
            :format-tooltip="(val: number) => val.toFixed(2)"
            class="param-slider-bar"
          />
          <span class="param-val">{{ similarity.toFixed(2) }}</span>
        </div>
      </div>

      <div class="topbar-right">
        <el-button text @click="handleNewSession">
          <el-icon :size="16"><Plus /></el-icon>
          <span>新会话</span>
        </el-button>
        <el-button text @click="handleOpenSessions">
          <el-icon :size="16"><Clock /></el-icon>
          <span>历史会话</span>
        </el-button>
      </div>
    </div>

    <div class="chat-main-area">
      <div class="chat-title-bar">
        <div class="chat-title-left">
          <h3>AI 智能问答</h3>
          <p>基于已向量化的知识片段回答问题</p>
        </div>
        <span class="chat-session-no">会话 #{{ sessionNo }}</span>
      </div>

      <div class="chat-messages" ref="messagesRef">
        <div v-if="messages.length === 0" class="welcome-state">
          <div class="welcome-avatar">
            <el-icon :size="48"><ChatDotRound /></el-icon>
          </div>
          <p class="welcome-title">您好，我是 AI 智能助手</p>
          <p class="welcome-desc">基于已向量化的知识片段，为您提供准确的知识问答服务</p>
        </div>

        <div v-else class="messages-wrapper">
          <div
            v-for="msg in messages"
            :key="msg.id"
            :class="['message-bubble', msg.role]"
          >
            <div class="bubble-avatar" v-if="msg.role === 'assistant'">
              <el-avatar :size="32">
                <el-icon :size="18"><ChatDotRound /></el-icon>
              </el-avatar>
            </div>
            <div class="bubble-content">
              <div class="bubble-header">
                <span class="bubble-name">{{ msg.role === 'user' ? '我' : 'AI 助手' }}</span>
                <span class="bubble-time">{{ formatTime(msg.timestamp) }}</span>
              </div>
              <div class="bubble-text" v-html="renderMarkdown(msg.content)"></div>
              <span v-if="msg.streaming && msg.content" class="typing-cursor">|</span>
              <div v-if="msg.streaming && !msg.content" class="typing-wait">
                <div class="typing-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
            <div class="bubble-avatar" v-if="msg.role === 'user'">
              <el-avatar :size="32" :icon="User" />
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <div class="input-wrapper">
          <el-input
            v-model="inputText"
            type="textarea"
            :rows="3"
            placeholder="请输入客户咨询内容..."
            resize="none"
            :disabled="isLoading && !isStreaming"
            @keydown.enter.exact.prevent="handleSend"
          />
          <div class="input-footer">
            <span class="input-tip">Enter 发送，Shift+Enter 换行</span>
            <el-button
              v-if="isStreaming"
              type="danger"
              @click="handleStop"
            >
              停止生成
            </el-button>
            <el-button
              v-else
              type="primary"
              :disabled="!inputText.trim() || (isLoading && !isStreaming)"
              @click="handleSend"
            >
              <el-icon :size="16"><Position /></el-icon>
              <span>发送</span>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="showSessionDialog"
      title="历史会话"
      width="480px"
    >
      <div v-if="sessionLoading" class="session-loading">
        <el-icon class="is-loading" :size="24"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <div v-else-if="sessions.length === 0" class="session-empty">
        暂无历史会话
      </div>
      <div v-else class="session-list">
        <div class="session-list-header">
          <span>共 {{ sessions.length }} 个会话</span>
          <el-button text type="danger" size="small" @click="handleDeleteAllSessions">
            清空全部
          </el-button>
        </div>
        <div
          v-for="session in sessions"
          :key="session.sessionId"
          :class="['session-item', { active: session.sessionId === sessionId }]"
          @click="handleSwitchSession(session.sessionId)"
        >
          <div class="session-info">
            <span class="session-preview">{{ session.preview }}</span>
            <span class="session-time">{{ formatSessionTime(session.lastActiveTime) }}</span>
          </div>
          <el-button
            text
            type="danger"
            size="small"
            @click.stop="handleDeleteSession(session.sessionId)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  Plus,
  Clock,
  Loading,
  Delete,
  ChatDotRound,
  User,
  Position
} from '@element-plus/icons-vue'
import { useChat } from '@/composables/useChat'
import { renderMarkdown } from '@/utils/markdown'
import { formatTime } from '@/utils/format'
import dayjs from 'dayjs'
import type { SearchResult } from '@/types/chat'

const emit = defineEmits<{
  (e: 'search-results', results: SearchResult[]): void
}>()

const {
  messages,
  isLoading,
  isStreaming,
  searchResults,
  sessionId,
  sessions,
  sendMessage,
  stopStreaming,
  clearMessages,
  restoreSession,
  switchSession,
  fetchSessions,
  deleteSession,
  deleteAllSessions
} = useChat()

const inputText = ref('')
const messagesRef = ref<HTMLElement>()
const showSessionDialog = ref(false)
const sessionLoading = ref(false)

const chatModel = ref('deepseek-v3')
const embeddingModel = ref('text-embedding-v3')
const topK = ref(15)
const similarity = ref(0.60)

const sessionNo = computed(() => {
  return sessionId.value ? (sessionId.value.substring(0, 4)) : '--'
})

const formatSessionTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

watch(searchResults, (val) => {
  emit('search-results', val)
}, { immediate: true })

const handleSend = async () => {
  if (!inputText.value.trim()) return

  const question = inputText.value
  inputText.value = ''

  await sendMessage(question, topK.value, similarity.value)

  await nextTick()
  scrollToBottom()
}

const handleStop = () => {
  stopStreaming()
}

const handleNewSession = async () => {
  try {
    await ElMessageBox.confirm('确定要新建会话吗？当前会话记录将保留在历史中。', '新建会话', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })
    clearMessages()
  } catch {
    // cancelled
  }
}

const handleOpenSessions = async () => {
  showSessionDialog.value = true
  sessionLoading.value = true
  try {
    await fetchSessions()
  } finally {
    sessionLoading.value = false
  }
}

const handleSwitchSession = async (targetSessionId: string) => {
  await switchSession(targetSessionId)
  showSessionDialog.value = false
  await nextTick()
  scrollToBottom()
}

const handleDeleteSession = async (targetSessionId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除该会话吗？删除后不可恢复。', '删除会话', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteSession(targetSessionId)
    ElMessage.success('删除成功')
  } catch {
    // cancelled
  }
}

const handleDeleteAllSessions = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有历史会话吗？此操作不可恢复！', '清空全部会话', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteAllSessions()
    ElMessage.success('已清空全部会话')
  } catch {
    // cancelled
  }
}

const scrollToBottom = () => {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

watch(messages, () => {
  nextTick(() => scrollToBottom())
}, { deep: true })

onMounted(() => {
  restoreSession()
})
</script>

<style scoped lang="scss">
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}

.chat-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topbar-select {
  width: 190px;
}

.topbar-center {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
}

.param-item {
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    font-size: 13px;
    color: #475569;
    white-space: nowrap;
  }
}

.param-number {
  width: 100px;
}

.param-slider-bar {
  width: 140px;
}

.param-val {
  font-size: 13px;
  color: #64748b;
  min-width: 36px;
  text-align: right;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.chat-main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chat-title-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.chat-title-left {
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
  }

  p {
    margin: 4px 0 0;
    font-size: 12px;
    color: #94a3b8;
  }
}

.chat-session-no {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 10px;
  border-radius: 10px;
  white-space: nowrap;
  margin-top: 2px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.welcome-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.welcome-avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  margin-bottom: 20px;
}

.welcome-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px;
}

.welcome-desc {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}

.messages-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message-bubble {
  display: flex;
  gap: 10px;
  align-items: flex-start;

  &.user {
    justify-content: flex-end;

    .bubble-content {
      align-items: flex-end;
    }

    .bubble-text {
      background: #3b82f6;
      color: #ffffff;
      border-radius: 12px 12px 4px 12px;

      :deep(p) {
        margin: 0;
      }
    }
  }

  &.assistant {
    .bubble-text {
      background: #f1f5f9;
      color: #334155;
      border-radius: 12px 12px 12px 4px;
    }
  }
}

.bubble-avatar {
  flex-shrink: 0;
}

.bubble-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 72%;
}

.bubble-header {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
}

.bubble-name {
  font-weight: 500;
}

.bubble-time {
  color: #cbd5e1;
}

.bubble-text {
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.7;
  word-wrap: break-word;

  :deep(code) {
    font-family: 'Fira Code', monospace;
    font-size: 13px;
  }

  :deep(pre) {
    margin: 8px 0;
    padding: 10px 12px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 13px;
  }
}

.typing-cursor {
  display: inline;
  font-weight: 700;
  font-size: 16px;
  color: #3b82f6;
  animation: blink 1s step-end infinite;
  margin-left: 2px;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.typing-wait {
  padding: 4px 0;
}

.typing-dots {
  display: flex;
  gap: 4px;

  span {
    width: 8px;
    height: 8px;
    background: #cbd5e1;
    border-radius: 50%;
    animation: typingDot 1.4s infinite ease-in-out;

    &:nth-child(1) {
      animation-delay: 0s;
    }

    &:nth-child(2) {
      animation-delay: 0.2s;
    }

    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes typingDot {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-8px);
  }
}

.chat-input-area {
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
  flex-shrink: 0;
}

.input-wrapper {
  :deep(.el-textarea__inner) {
    padding: 12px;
    font-size: 14px;
    line-height: 1.5;
    border-radius: 8px;
  }
}

.input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.input-tip {
  font-size: 12px;
  color: #94a3b8;
}

.session-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--el-text-color-secondary);
}

.session-empty {
  text-align: center;
  padding: 40px 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.session-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &.active {
    background: var(--el-color-primary-light-9);
    border: 1px solid var(--el-color-primary-light-7);
  }

  .session-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .session-preview {
      font-size: 14px;
      color: var(--el-text-color-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .session-time {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
}
</style>