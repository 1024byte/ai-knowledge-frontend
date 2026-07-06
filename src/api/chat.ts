import apiClient from './index'
import type { ChatRequest, ChatResponse, SearchResult, HistoryMessage, SessionInfo } from '@/types/chat'

export const chatApi = {
  ask: (question: string, sessionId: string, topK: number = 3): Promise<ChatResponse> => {
    const data: ChatRequest = { question, sessionId, topK }
    return apiClient.post('/chat/ask', data)
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
  }
}
