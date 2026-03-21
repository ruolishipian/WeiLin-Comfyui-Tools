/**
 * 缓存管理器
 *
 * 提供LRU缓存实现，支持TTL过期时间
 */

interface CacheEntry<T> {
  value: T
  timestamp: number
}

interface CacheOptions {
  maxSize?: number
  ttl?: number // 过期时间（毫秒）
}

class LRUCache<T> {
  private maxSize: number
  private ttl: number | null
  private cache: Map<string, CacheEntry<T>>

  constructor(maxSize = 100, ttl: number | null = null) {
    this.maxSize = maxSize
    this.ttl = ttl
    this.cache = new Map()
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      return undefined
    }

    // 检查是否过期
    if (this.ttl !== null && Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return undefined
    }

    // 移到最后表示最近使用
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value
  }

  set(key: string, value: T): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // 如果缓存已满，删除最久未使用的
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    // 检查是否过期
    if (this.ttl !== null && Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

// 缓存实例集合
const caches = new Map<string, LRUCache<unknown>>()

/**
 * 缓存管理器
 */
export const cacheManager = {
  /**
   * 获取或创建缓存
   */
  getCache: <T>(name: string, options: CacheOptions = {}): LRUCache<T> => {
    let cache = caches.get(name) as LRUCache<T> | undefined

    if (!cache) {
      cache = new LRUCache<T>(options.maxSize ?? 100, options.ttl ?? null)
      caches.set(name, cache as LRUCache<unknown>)
    }

    return cache
  },

  /**
   * 清除指定缓存
   */
  clear: (name: string) => {
    const cache = caches.get(name)
    if (cache) {
      cache.clear()
    }
  },

  /**
   * 清除所有缓存
   */
  clearAll: () => {
    caches.forEach((cache) => {
      cache.clear()
    })
  },

  /**
   * 删除指定缓存
   */
  delete: (name: string) => {
    caches.delete(name)
  },

  /**
   * 获取缓存数量
   */
  size: () => caches.size
}
