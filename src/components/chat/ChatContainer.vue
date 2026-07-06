<template>
  <div class="chat-container">
    <div class="chat-header">
      <h3>智能问答</h3>
      <div class="header-actions">
        <el-button text @click="handleOpenSessions">
          <el-icon><clock /></el-icon>
          历史会话
        </el-button>
        <el-button text @click="handleClear">
          <el-icon><delete /></el-icon>
          新建会话
        </el-button>
      </div>
    </div>

    <div class="chat-messages" ref="messagesRef">
      <message-list :messages="messages" :is-loading="isLoading" />
    </div>

    <div class="chat-input">
      <chat-input
        v-model="inputMessage"
        :disabled="isLoading"
        @send="handleSend"
      />
    </div>

    <el-dialog
      v-model="showSessionDialog"
      title="历史会话"
      width="480px"
    >
      <div v-if="sessionLoading" class="session-loading">
        <el-icon class="is-loading" :size="24"><loading /></el-icon>
        <span>加载中...</span>
      </div>
      <div v-else-if="sessions.length === 0" class="session-empty">
        暂无历史会话
      </div>
      <div v-else class="session-list">
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
            <el-icon><delete /></el-icon>
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Delete, Clock, Loading } from '@element-plus/icons-vue'
import { useChat } from '@/composables/useChat'
import MessageList from './MessageList.vue'
import ChatInput from './ChatInput.vue'
import dayjs from 'dayjs'

const {
  messages,
  isLoading,
  sessionId,
  sessions,
  sendMessage,
  clearMessages,
  restoreSession,
  switchSession,
  fetchSessions,
  deleteSession
} = useChat()

const inputMessage = ref('')
const messagesRef = ref<HTMLElement>()
const showSessionDialog = ref(false)
const sessionLoading = ref(false)

const formatSessionTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

const handleSend = async () => {
  if (!inputMessage.value.trim()) return

  const question = inputMessage.value
  inputMessage.value = ''

  await sendMessage(question)

  await nextTick()
  scrollToBottom()
}

const handleClear = async () => {
  try {
    await ElMessageBox.confirm('确定要新建会话吗？当前会话记录将保留在历史中。', '新建会话', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })

    clearMessages()
  } catch {
    // 用户取消
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
    // 用户取消或删除失败
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
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--el-border-color);

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
  }

  .header-actions {
    display: flex;
    gap: 4px;
  }
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.chat-input {
  padding: 16px 20px;
  border-top: 1px solid var(--el-border-color);
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
