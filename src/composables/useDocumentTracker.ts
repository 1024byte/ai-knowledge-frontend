import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { documentApi } from '@/api/document'

export interface DocumentStatusChange {
  docId: number
  status: string
  chunkCount: number
  errorMessage: string | null
}

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 5 * 60 * 1000

export function useDocumentTracker() {
  const trackingDocs = ref<Map<number, { status: string; errorMessage: string | null; chunkCount: number }>>(new Map())
  const activeEventSources = new Map<number, EventSource>()
  const activePollTimers = new Map<number, ReturnType<typeof setInterval>>()
  const activePollTimeouts = new Map<number, ReturnType<typeof setTimeout>>()

  const onStatusChange = ref<((change: DocumentStatusChange) => void) | null>(null)

  const cleanup = (docId: number) => {
    const es = activeEventSources.get(docId)
    if (es) {
      es.close()
      activeEventSources.delete(docId)
    }
    const pollTimer = activePollTimers.get(docId)
    if (pollTimer) {
      clearInterval(pollTimer)
      activePollTimers.delete(docId)
    }
    const pollTimeout = activePollTimeouts.get(docId)
    if (pollTimeout) {
      clearTimeout(pollTimeout)
      activePollTimeouts.delete(docId)
    }
  }

  const cleanupAll = () => {
    activeEventSources.forEach((es) => es.close())
    activeEventSources.clear()
    activePollTimers.forEach((timer) => clearInterval(timer))
    activePollTimers.clear()
    activePollTimeouts.forEach((timeout) => clearTimeout(timeout))
    activePollTimeouts.clear()
  }

  const startPolling = (docId: number) => {
    const pollTimer = setInterval(async () => {
      try {
        const info = await documentApi.getDocumentStatus(docId)
        trackingDocs.value.set(docId, {
          status: info.status,
          errorMessage: info.errorMessage,
          chunkCount: info.chunkCount
        })

        if (info.status === 'active') {
          ElMessage.success(`文档处理完成，共 ${info.chunkCount} 个片段`)
          cleanup(docId)
          onStatusChange.value?.({
            docId,
            status: info.status,
            chunkCount: info.chunkCount,
            errorMessage: info.errorMessage
          })
        } else if (info.status === 'failed') {
          ElMessage.error(`处理失败: ${info.errorMessage || '未知错误'}`)
          cleanup(docId)
          onStatusChange.value?.({
            docId,
            status: info.status,
            chunkCount: info.chunkCount,
            errorMessage: info.errorMessage
          })
        }
      } catch {
        // 轮询请求失败，继续重试
      }
    }, POLL_INTERVAL_MS)

    activePollTimers.set(docId, pollTimer)

    const pollTimeout = setTimeout(() => {
      cleanup(docId)
      ElMessage.warning('处理时间较长，请稍后手动刷新页面')
    }, POLL_TIMEOUT_MS)

    activePollTimeouts.set(docId, pollTimeout)
  }

  const trackDocument = (docId: number) => {
    if (activeEventSources.has(docId) || activePollTimers.has(docId)) {
      return
    }

    trackingDocs.value.set(docId, { status: 'processing', errorMessage: null, chunkCount: 0 })

    const sseUrl = documentApi.getSseUrl(docId)
    const eventSource = new EventSource(sseUrl)

    let sseConnected = false

    eventSource.addEventListener('connected', () => {
      sseConnected = true
    })

    eventSource.addEventListener('status', (e) => {
      const data = JSON.parse(e.data)
      const { status, chunkCount, errorMessage } = data

      trackingDocs.value.set(docId, { status, errorMessage: errorMessage || null, chunkCount: chunkCount || 0 })

      if (status === 'active') {
        ElMessage.success(`文档处理完成，共 ${chunkCount || 0} 个片段`)
      } else if (status === 'failed') {
        ElMessage.error(`处理失败: ${errorMessage || '未知错误'}`)
      }

      eventSource.close()
      activeEventSources.delete(docId)
      onStatusChange.value?.({ docId, status, chunkCount: chunkCount || 0, errorMessage: errorMessage || null })
    })

    eventSource.onerror = () => {
      if (!sseConnected) {
        eventSource.close()
        activeEventSources.delete(docId)
        startPolling(docId)
      }
    }

    activeEventSources.set(docId, eventSource)
  }

  const getDocStatus = (docId: number) => {
    return trackingDocs.value.get(docId)
  }

  onUnmounted(() => {
    cleanupAll()
  })

  return {
    trackingDocs,
    onStatusChange,
    trackDocument,
    getDocStatus,
    cleanup,
    cleanupAll
  }
}