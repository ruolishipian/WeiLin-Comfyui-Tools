/**
 * 翻译结果LRU缓存模块
 *
 * 提供翻译结果的内存缓存，支持localStorage持久化，减少网络请求。
 */

const CACHE_VERSION = 1
const STORAGE_KEY = 'translation-cache'

interface CacheEntry {
  translation: string
  color?: string
  colorId?: number
  timestamp: number
}

interface CacheData {
  version: number
  entries: Array<[string, CacheEntry]>
}

interface CacheStats {
  size: number
  maxSize: number
  hits: number
  misses: number
  hitRate: number
}

export class TranslationLRUCache {
  private maxSize: number
  private cache: Map<string, CacheEntry>
  private enablePersist: boolean
  private stats: { hits: number; misses: number }

  constructor(maxSize = 500, enablePersist = true) {
    this.maxSize = maxSize
    this.cache = new Map()
    this.enablePersist = enablePersist
    this.stats = { hits: 0, misses: 0 }

    // 启动时恢复缓存
    if (this.enablePersist) {
      this.restore()
    }
  }

  /**
   * 标准化缓存键
   */
  private normalizeKey(key: string): string {
    return key.toLowerCase().trim()
  }

  /**
   * 获取缓存值
   */
  get(key: string): { translation: string; color?: string; colorId?: number } | null {
    const normalizedKey = this.normalizeKey(key)
    const entry = this.cache.get(normalizedKey)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // 检查是否过期（24小时）
    const maxAge = 24 * 60 * 60 * 1000
    if (Date.now() - entry.timestamp > maxAge) {
      this.cache.delete(normalizedKey)
      this.stats.misses++
      return null
    }

    // 移到最后表示最近使用（LRU策略）
    this.cache.delete(normalizedKey)
    this.cache.set(normalizedKey, entry)
    this.stats.hits++

    return {
      translation: entry.translation,
      color: entry.color,
      colorId: entry.colorId
    }
  }

  /**
   * 设置缓存值
   */
  set(
    key: string,
    translation: string,
    color?: string,
    colorId?: number
  ): void {
    const normalizedKey = this.normalizeKey(key)

    // 如果已存在，先删除
    if (this.cache.has(normalizedKey)) {
      this.cache.delete(normalizedKey)
    } else if (this.cache.size >= this.maxSize) {
      // 如果缓存已满，删除最久未使用的
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    // 添加新条目
    this.cache.set(normalizedKey, {
      translation,
      color,
      colorId,
      timestamp: Date.now()
    })

    // 持久化
    if (this.enablePersist) {
      this.persist()
    }
  }

  /**
   * 删除缓存条目
   */
  delete(key: string): boolean {
    const normalizedKey = this.normalizeKey(key)
    const result = this.cache.delete(normalizedKey)
    if (result && this.enablePersist) {
      this.persist()
    }
    return result
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0 }
    if (this.enablePersist) {
      this.persist()
    }
  }

  /**
   * 持久化缓存到localStorage
   */
  private persist(): void {
    try {
      const data: CacheData = {
        version: CACHE_VERSION,
        entries: Array.from(this.cache.entries())
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      // localStorage可能已满，忽略错误
      console.warn('Failed to persist translation cache:', e)
    }
  }

  /**
   * 从localStorage恢复缓存
   */
  private restore(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {return}

      const data: CacheData = JSON.parse(stored)

      // 版本号不匹配，清空旧缓存
      if (data.version !== CACHE_VERSION) {
        localStorage.removeItem(STORAGE_KEY)
        return
      }

      // 恢复缓存条目
      const maxAge = 24 * 60 * 60 * 1000
      const now = Date.now()

      for (const [key, entry] of data.entries) {
        // 只恢复未过期的条目
        if (now - entry.timestamp <= maxAge) {
          this.cache.set(key, entry)
        }
      }
    } catch (e) {
      console.warn('Failed to restore translation cache:', e)
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate
    }
  }
}

// 全局缓存实例
export const translationCache = new TranslationLRUCache(500, true)
