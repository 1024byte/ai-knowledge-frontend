import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { documentApi } from '@/api/document'
import type { DocumentRecord } from '@/types/document'

export const useDocumentStore = defineStore('document', () => {
  const documents = ref<DocumentRecord[]>([])
  const categories = ref<string[]>([])
  const loading = ref(false)

  const documentCount = computed(() => documents.value.length)
  const categoryCount = computed(() => categories.value.length)

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

  const fetchCategories = async () => {
    try {
      categories.value = await documentApi.getCategories()
    } catch (error) {
      console.error('Fetch categories error:', error)
    }
  }

  const createCategory = async (name: string, description?: string) => {
    try {
      await documentApi.createCategory({ name, description })
      await fetchCategories()
    } catch (error) {
      console.error('Create category error:', error)
      throw error
    }
  }

  const deleteCategory = async (name: string) => {
    try {
      await documentApi.deleteCategory(name)
      await fetchCategories()
      await fetchDocuments()
    } catch (error) {
      console.error('Delete category error:', error)
      throw error
    }
  }

  return {
    documents,
    categories,
    loading,
    documentCount,
    categoryCount,
    fetchDocuments,
    fetchCategories,
    createCategory,
    deleteCategory
  }
})
