const STORAGE_PREFIX = 'knowledge_base_'

export function setStorage(key: string, value: any): void {
  try {
    const data = JSON.stringify(value)
    localStorage.setItem(STORAGE_PREFIX + key, data)
  } catch (error) {
    console.error('Storage set error:', error)
  }
}

export function getStorage<T = any>(key: string, defaultValue?: T): T | undefined {
  try {
    const data = localStorage.getItem(STORAGE_PREFIX + key)
    if (data === null) {
      return defaultValue
    }
    return JSON.parse(data) as T
  } catch (error) {
    console.error('Storage get error:', error)
    return defaultValue
  }
}

export function removeStorage(key: string): void {
  localStorage.removeItem(STORAGE_PREFIX + key)
}

export function clearStorage(): void {
  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(key)
    }
  })
}