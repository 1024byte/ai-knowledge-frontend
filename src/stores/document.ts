import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { documentApi } from '@/api/document'
import type { DocumentRecord } from '@/types/document'

export const useDocumentStore = defineStore('document', () => {
  const documents = ref<DocumentRecord[]>([])
  const loading = ref(false)

  const documentCount = computed(() => documents.value.length)

  const fetchDocuments = async () => {
    loading.value = true
    try {
      documents.value = await documentApi.getList()
    } catch (error) {
      console.error('Fetch documents error:', error)
    } finally {
      loading.value = false
    }
  }

  return {
    documents,
    loading,
    documentCount,
    fetchDocuments
  }
})
