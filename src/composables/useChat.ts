import { ref } from 'vue'
import { chatApi } from '@/api/chat'
import type { ChatMessage, SearchResult, SessionInfo } from '@/types/chat'

const SESSION_STORAGE_KEY = 'knowledge_base_session_id'

export function useChat() {
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const searchResults = ref<SearchResult[]>([])
  const sessionId = ref('')
  const sessions = ref<SessionInfo[]>([])

  const ensureSessionId = () => {
    if (!sessionId.value) {
      sessionId.value = crypto.randomUUID()
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId.value)
    }
  }

  const restoreSession = async () => {
    const savedSessionId = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!savedSessionId) return

    sessionId.value = savedSessionId
    try {
      const history = await chatApi.getHistory(savedSessionId)
      messages.value = history.map((msg, index) => ({
        id: index + 1,
        role: msg.role,
        content: msg.content,
        sources: msg.sources,
        timestamp: new Date(msg.createTime)
      }))
    } catch (error) {
      console.error('Restore session error:', error)
      sessionId.value = ''
      localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }

  const switchSession = async (targetSessionId: string) => {
    sessionId.value = targetSessionId
    localStorage.setItem(SESSION_STORAGE_KEY, targetSessionId)
    try {
      const history = await chatApi.getHistory(targetSessionId)
      messages.value = history.map((msg, index) => ({
        id: index + 1,
        role: msg.role,
        content: msg.content,
        sources: msg.sources,
        timestamp: new Date(msg.createTime)
      }))
    } catch (error) {
      console.error('Switch session error:', error)
      messages.value = []
    }
  }

  const sendMessage = async (question: string, topK: number = 3) => {
    ensureSessionId()
    messages.value.push({
      id: Date.now(),
      role: 'user',
      content: question,
      timestamp: new Date()
    })

    isLoading.value = true

    try {
      const response = await chatApi.ask(question, sessionId.value, topK)

      messages.value.push({
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        processingTimeMs: response.processingTimeMs,
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Chat error:', error)
      messages.value.push({
        id: Date.now() + 1,
        role: 'assistant',
        content: '抱歉，发生了错误，请稍后重试。',
        timestamp: new Date()
      })
    } finally {
      isLoading.value = false
    }
  }

  const searchDocuments = async (query: string, topK: number = 5) => {
    isLoading.value = true
    try {
      searchResults.value = await chatApi.search(query, topK)
    } catch (error) {
      console.error('Search error:', error)
      searchResults.value = []
    } finally {
      isLoading.value = false
    }
  }

  const fetchSessions = async () => {
    try {
      sessions.value = await chatApi.getSessions()
    } catch (error) {
      console.error('Fetch sessions error:', error)
      sessions.value = []
    }
  }

  const deleteSession = async (targetSessionId: string) => {
    try {
      await chatApi.deleteSession(targetSessionId)
      sessions.value = sessions.value.filter(s => s.sessionId !== targetSessionId)
      if (sessionId.value === targetSessionId) {
        messages.value = []
        sessionId.value = ''
        localStorage.removeItem(SESSION_STORAGE_KEY)
      }
    } catch (error) {
      console.error('Delete session error:', error)
      throw error
    }
  }

  const clearMessages = () => {
    messages.value = []
    searchResults.value = []
    sessionId.value = ''
    localStorage.removeItem(SESSION_STORAGE_KEY)
  }

  return {
    messages,
    isLoading,
    searchResults,
    sessionId,
    sessions,
    sendMessage,
    searchDocuments,
    restoreSession,
    switchSession,
    fetchSessions,
    deleteSession,
    clearMessages
  }
}
