/**
 * 批量更新器
 *
 * 用于批量处理localStorage更新等操作，减少频繁IO
 */

interface BatchItem {
  key: string
  value: string
}

let batchQueue: BatchItem[] = []
let batchTimer: ReturnType<typeof setTimeout> | null = null
const BATCH_DELAY = 100 // 批量更新延迟（毫秒）

/**
 * 批量更新器
 */
export const batchUpdater = {
  /**
   * 添加到批量队列
   */
  queue: (key: string, value: string) => {
    // 检查是否已存在相同的key，如果存在则更新
    const existingIndex = batchQueue.findIndex((item) => item.key === key)
    if (existingIndex !== -1) {
      batchQueue[existingIndex].value = value
    } else {
      batchQueue.push({ key, value })
    }

    // 触发批量更新
    batchUpdater.scheduleFlush()
  },

  /**
   * 批量添加localStorage项
   */
  batchLocalStorage: (items: BatchItem[]) => {
    items.forEach((item) => {
      const existingIndex = batchQueue.findIndex((q) => q.key === item.key)
      if (existingIndex !== -1) {
        batchQueue[existingIndex].value = item.value
      } else {
        batchQueue.push(item)
      }
    })

    batchUpdater.scheduleFlush()
  },

  /**
   * 调度批量更新
   */
  scheduleFlush: () => {
    if (batchTimer !== null) {
      return
    }

    batchTimer = setTimeout(() => {
      batchUpdater.flush()
      batchTimer = null
    }, BATCH_DELAY)
  },

  /**
   * 立即执行批量更新
   */
  flush: () => {
    if (batchQueue.length === 0) {
      return
    }

    try {
      batchQueue.forEach((item) => {
        localStorage.setItem(item.key, item.value)
      })
    } catch (e) {
      console.warn('Batch update failed:', e)
    }

    batchQueue = []
  },

  /**
   * 清空队列
   */
  clear: () => {
    batchQueue = []
    if (batchTimer !== null) {
      clearTimeout(batchTimer)
      batchTimer = null
    }
  },

  /**
   * 获取队列大小
   */
  size: () => batchQueue.length
}
