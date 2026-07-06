<template>
  <div :class="['message-item', message.role]">
    <div class="message-avatar">
      <el-avatar :size="36" :icon="avatarIcon" />
    </div>

    <div class="message-content">
      <div class="message-header">
        <span class="message-role">{{ roleText }}</span>
        <span class="message-time">{{ formatTime(message.timestamp) }}</span>
        <span v-if="message.processingTimeMs" class="processing-time">
          耗时 {{ message.processingTimeMs }}ms
        </span>
      </div>

      <div class="message-text" v-html="renderedContent"></div>

      <div v-if="message.sources && message.sources.length > 0" class="message-sources">
        <span class="sources-label">参考来源：</span>
        <el-tag
          v-for="source in message.sources"
          :key="source"
          size="small"
          type="info"
          class="source-tag"
        >
          {{ source }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { User, ChatDotRound } from '@element-plus/icons-vue'
import { renderMarkdown } from '@/utils/markdown'
import { formatTime } from '@/utils/format'
import type { ChatMessage } from '@/types/chat'

const props = defineProps<{
  message: ChatMessage
}>()

const avatarIcon = computed(() => {
  return props.message.role === 'user' ? User : ChatDotRound
})

const roleText = computed(() => {
  return props.message.role === 'user' ? '我' : 'AI 助手'
})

const renderedContent = computed(() => {
  return renderMarkdown(props.message.content)
})
</script>

<style scoped lang="scss">
.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;

  &.user {
    flex-direction: row-reverse;

    .message-content {
      align-items: flex-end;
    }

    .message-text {
      background: var(--el-color-primary-light-9);
    }
  }

  &.assistant {
    .message-text {
      background: var(--el-fill-color-light);
    }
  }
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 80%;
}

.message-header {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.processing-time {
  color: var(--el-color-success);
}

.message-text {
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
  word-wrap: break-word;

  :deep(pre) {
    margin: 8px 0;
    padding: 12px;
    background: var(--el-fill-color-darker);
    border-radius: 4px;
    overflow-x: auto;

    code {
      font-family: 'Fira Code', monospace;
      font-size: 13px;
    }
  }

  :deep(code:not(pre code)) {
    padding: 2px 6px;
    background: var(--el-fill-color);
    border-radius: 3px;
    font-family: 'Fira Code', monospace;
    font-size: 13px;
  }

  :deep(p) {
    margin: 8px 0;

    &:first-child {
      margin-top: 0;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.message-sources {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;

  .sources-label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .source-tag {
    font-size: 11px;
  }
}
</style>
