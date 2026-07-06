export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  processingTimeMs?: number
  timestamp: Date
}

export interface ChatRequest {
  question: string
  sessionId: string
  topK?: number
}

export interface ChatResponse {
  answer: string
  sources: string[]
  processingTimeMs: number
}

export interface SearchResult {
  content: string
  score: number
  source: string
}

export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
  createTime: string
}

export interface SessionInfo {
  sessionId: string
  preview: string
  lastActiveTime: string
}
