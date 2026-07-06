import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatMessage } from '@/types/chat'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)

  const messageCount = computed(() => messages.value.length)
  const lastMessage = computed(() => messages.value[messages.value.length - 1])

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    messages.value.push({
      id: Date.now(),
      ...message,
      timestamp: new Date()
    })
  }

  const updateMessage = (id: number, content: string) => {
    const index = messages.value.findIndex(m => m.id === id)
    if (index !== -1) {
      messages.value[index].content = content
    }
  }

  const clearMessages = () => {
    messages.value = []
  }

  const exportMessages = () => {
    return JSON.stringify(messages.value, null, 2)
  }

  const importMessages = (json: string) => {
    try {
      const imported = JSON.parse(json)
      messages.value = imported
    } catch (error) {
      console.error('Import failed:', error)
    }
  }

  return {
    messages,
    isLoading,
    messageCount,
    lastMessage,
    addMessage,
    updateMessage,
    clearMessages,
    exportMessages,
    importMessages
  }
})
