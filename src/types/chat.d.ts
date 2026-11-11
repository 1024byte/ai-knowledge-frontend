export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  processingTimeMs?: number
  timestamp: Date
  streaming?: boolean
}

export interface ChatRequest {
  question: string
  sessionId: string
  topK?: number
  minScore?: number
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
  sources?: string[]
  createTime: string
}

export interface SessionInfo {
  sessionId: string
  preview: string
  lastActiveTime: string
}

export interface SSEStartEvent {
  sessionId: string
  messageId: string
}

export interface SSEDoneEvent {
  sessionId: string
}

export interface SSEErrorEvent {
  error: string
}