import { ref } from 'vue'
import { chatApi } from '@/api/chat'
import type { ChatMessage, SearchResult, SessionInfo } from '@/types/chat'

const SESSION_STORAGE_KEY = 'knowledge_base_session_id'

export function useChat() {
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const searchResults = ref<SearchResult[]>([])
  const sessionId = ref('')
  const sessions = ref<SessionInfo[]>([])

  let abortController: AbortController | null = null

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
      console.error('[Chat] 恢复会话失败:', error)
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
      console.error('[Chat] 切换会话失败:', error)
      messages.value = []
    }
  }

  const tryStreamAsk = (question: string, topK: number, assistantIndex: number): Promise<boolean> => {
    return new Promise((resolve) => {
      let resolved = false

      chatApi.askStream(
        question,
        sessionId.value,
        topK,
        {
          onToken: (token: string) => {
            if (token) {
              messages.value[assistantIndex].content += token
            }
          },
          onDone: (_sessionId: string) => {
            if (resolved) return
            resolved = true
            console.log('[Chat] 流式完成')
            messages.value[assistantIndex].streaming = false
            resolve(true)
          },
          onError: (error: string) => {
            if (resolved) return
            resolved = true
            console.warn('[Chat] 流式失败:', error, '→ 降级到旧接口')
            resolve(false)
          }
        },
        abortController?.signal
      ).catch((err: any) => {
        if (err.name === 'AbortError') {
          if (!resolved) {
            resolved = true
            resolve(false)
          }
          return
        }
        if (!resolved) {
          resolved = true
          console.warn('[Chat] 流式异常:', err.message, '→ 降级到旧接口')
          resolve(false)
        }
      })
    })
  }

  const fallbackAsk = async (question: string, topK: number, assistantIndex: number) => {
    const msg = messages.value[assistantIndex]
    console.log('[Chat] 使用旧接口 /chat/ask')
    try {
      const response = await chatApi.ask(question, sessionId.value, topK)
      msg.content = response.answer
      msg.sources = response.sources
      msg.processingTimeMs = response.processingTimeMs
      msg.streaming = false
    } catch (error: any) {
      console.error('[Chat] 旧接口也失败了:', error)
      if (!msg.content) {
        msg.content = '抱歉，发生了错误，请稍后重试。'
      }
      msg.streaming = false
    }
  }

  const sendMessage = async (question: string, topK: number = 3) => {
    ensureSessionId()

    console.log('[Chat] 发送问题:', question.substring(0, 50))

    messages.value.push({
      id: Date.now(),
      role: 'user',
      content: question,
      timestamp: new Date()
    })

    messages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      sources: [],
      timestamp: new Date(),
      streaming: true
    })
    const assistantIndex = messages.value.length - 1

    console.log('[Chat] 消息数组长度:', messages.value.length, 'assistantIndex:', assistantIndex)

    isLoading.value = true
    isStreaming.value = true
    abortController = new AbortController()

    const streamSuccess = await tryStreamAsk(question, topK, assistantIndex)

    if (!streamSuccess) {
      const wasAborted = abortController === null
      if (wasAborted) {
        if (!messages.value[assistantIndex].content) {
          messages.value[assistantIndex].content = '（已停止生成）'
        }
        messages.value[assistantIndex].streaming = false
      } else {
        messages.value[assistantIndex].content = ''
        messages.value[assistantIndex].streaming = true
        await fallbackAsk(question, topK, assistantIndex)
      }
    }

    isLoading.value = false
    isStreaming.value = false
    abortController = null
  }

  const stopStreaming = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  const searchDocuments = async (query: string, topK: number = 5) => {
    isLoading.value = true
    try {
      searchResults.value = await chatApi.search(query, topK)
    } catch (error) {
      console.error('[Chat] 搜索失败:', error)
      searchResults.value = []
    } finally {
      isLoading.value = false
    }
  }

  const fetchSessions = async () => {
    try {
      sessions.value = await chatApi.getSessions()
    } catch (error) {
      console.error('[Chat] 加载会话列表失败:', error)
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
      console.error('[Chat] 删除会话失败:', error)
      throw error
    }
  }

  const deleteAllSessions = async () => {
    try {
      await chatApi.deleteAllSessions()
      sessions.value = []
      messages.value = []
      sessionId.value = ''
      localStorage.removeItem(SESSION_STORAGE_KEY)
    } catch (error) {
      console.error('[Chat] 清空会话失败:', error)
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
    isStreaming,
    searchResults,
    sessionId,
    sessions,
    sendMessage,
    stopStreaming,
    searchDocuments,
    restoreSession,
    switchSession,
    fetchSessions,
    deleteSession,
    deleteAllSessions,
    clearMessages
  }
}