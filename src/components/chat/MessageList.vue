<template>
  <div class="message-list">
    <div v-if="messages.length === 0" class="empty-state">
      <el-icon :size="60"><chat-line-round /></el-icon>
      <p>开始对话吧！输入您的问题，我将基于知识库为您解答。</p>
    </div>
    
    <message-item
      v-for="message in messages"
      :key="message.id"
      :message="message"
    />
    
    <div v-if="isLoading" class="loading-message">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChatLineRound } from '@element-plus/icons-vue'
import MessageItem from './MessageItem.vue'
import type { ChatMessage } from '@/types/chat'

defineProps<{
  messages: ChatMessage[]
  isLoading: boolean
}>()
</script>

<style scoped lang="scss">
.message-list {
  min-height: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--el-text-color-secondary);
  
  p {
    margin-top: 16px;
    font-size: 14px;
  }
}

.loading-message {
  display: flex;
  justify-content: flex-start;
  margin-top: 16px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-radius: 12px;
  
  span {
    width: 8px;
    height: 8px;
    background: var(--el-text-color-secondary);
    border-radius: 50%;
    animation: typing 1.4s infinite ease-in-out;
    
    &:nth-child(1) { animation-delay: 0s; }
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}
</style>