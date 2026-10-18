import apiClient from './index'
import type { ChatRequest, ChatResponse, SearchResult, HistoryMessage, SessionInfo } from '@/types/chat'
import { getToken } from '@/utils/auth'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const chatApi = {
  ask: (question: string, sessionId: string, topK: number = 3): Promise<ChatResponse> => {
    const data: ChatRequest = { question, sessionId, topK }
    return apiClient.post('/chat/ask', data)
  },

  askStream: async (
    question: string,
    sessionId: string,
    topK: number = 3,
    callbacks: {
      onToken: (token: string) => void
      onDone: (sessionId: string) => void
      onError: (error: string) => void
    },
    signal?: AbortSignal
  ): Promise<void> => {
    const url = `${BASE_URL}/chat/ask/stream`
    console.log('[SSE] 请求:', url)

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ question, sessionId, topK }),
        signal
      })
    } catch (err: any) {
      console.error('[SSE] fetch 失败:', err.message)
      throw err
    }

    console.log('[SSE] 响应状态:', response.status, 'Content-Type:', response.headers.get('content-type'))

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.error('[SSE] 响应非 200:', response.status, text.substring(0, 200))
      callbacks.onError(`HTTP ${response.status}`)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      console.error('[SSE] 无 ReadableStream')
      callbacks.onError('浏览器不支持流式读取')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let receivedAnyEvent = false

    const parseField = (line: string): { field: string; value: string } | null => {
      const trimmed = line.replace(/\r$/, '')
      if (!trimmed || trimmed.startsWith(':')) return null

      const colonIdx = trimmed.indexOf(':')
      if (colonIdx === -1) {
        return { field: trimmed, value: '' }
      }

      let value = trimmed.substring(colonIdx + 1)
      if (value.startsWith(' ')) {
        value = value.substring(1)
      }
      return { field: trimmed.substring(0, colonIdx), value }
    }

    let eventType = ''
    let eventData = ''

    const dispatchEvent = () => {
      if (!eventData && eventType !== 'done' && eventType !== 'error') {
        eventType = ''
        eventData = ''
        return
      }
      receivedAnyEvent = true

      switch (eventType) {
        case 'start':
          console.log('[SSE] start:', eventData)
          break
        case 'token':
          callbacks.onToken(eventData)
          break
        case 'done':
          console.log('[SSE] done:', eventData)
          try {
            const parsed = JSON.parse(eventData)
            callbacks.onDone(parsed.sessionId)
          } catch {
            callbacks.onDone('')
          }
          break
        case 'error':
          console.error('[SSE] error:', eventData)
          try {
            const parsed = JSON.parse(eventData)
            callbacks.onError(parsed.error || '未知错误')
          } catch {
            callbacks.onError(eventData)
          }
          break
        default:
          console.log('[SSE] 未知事件类型:', eventType, 'data:', eventData.substring(0, 100))
      }

      eventType = ''
      eventData = ''
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('[SSE] 流结束, 剩余 buffer:', buffer.length, '字节')
          break
        }

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const rawLine of lines) {
          const parsed = parseField(rawLine)

          if (parsed === null) {
            dispatchEvent()
            continue
          }

          if (parsed.field === 'event') {
            eventType = parsed.value
          } else if (parsed.field === 'data') {
            eventData += (eventData ? '\n' : '') + parsed.value
          }
        }
      }

      buffer += decoder.decode()
      if (buffer.trim()) {
        const lines = buffer.split('\n')
        for (const rawLine of lines) {
          const parsed = parseField(rawLine)
          if (parsed === null) {
            dispatchEvent()
          } else if (parsed.field === 'event') {
            eventType = parsed.value
          } else if (parsed.field === 'data') {
            eventData += (eventData ? '\n' : '') + parsed.value
          }
        }
      }
      dispatchEvent()
    } catch (err: any) {
      console.error('[SSE] 读取流异常:', err.message)
      throw err
    }

    if (!receivedAnyEvent) {
      console.error('[SSE] 未收到任何 SSE 事件，响应可能不是 SSE 格式')
      callbacks.onError('服务器返回了非流式响应')
    }
  },

  search: (query: string, topK: number = 5): Promise<SearchResult[]> => {
    return apiClient.get('/chat/search', { params: { query, topK } })
  },

  getHistory: (sessionId: string): Promise<HistoryMessage[]> => {
    return apiClient.get(`/chat/history/${sessionId}`)
  },

  getSessions: (): Promise<SessionInfo[]> => {
    return apiClient.get('/chat/sessions')
  },

  deleteSession: (sessionId: string): Promise<void> => {
    return apiClient.delete(`/chat/session/${sessionId}`)
  },

  deleteAllSessions: (): Promise<void> => {
    return apiClient.delete('/chat/sessions')
  }
}