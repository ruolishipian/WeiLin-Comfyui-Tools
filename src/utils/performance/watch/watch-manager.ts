/**
 * Watch管理器
 *
 * 统一管理Vue watch实例，支持批量注册和清理
 */

import { watch, type WatchSource, type WatchCallback, type WatchOptions } from 'vue'

interface WatchRegistration {
  id: string
  stop: () => void
}

const registrations = new Map<string, WatchRegistration>()

/**
 * Watch管理器
 */
export const watchManager = {
  /**
   * 注册watch
   */
  register<T>(
    id: string,
    source: WatchSource<T>,
    callback: WatchCallback<T, T | undefined>,
    options?: WatchOptions & { shallow?: boolean }
  ): () => void {
    // 如果已存在相同ID的watch，先停止它
    this.unregister(id)

    const stop = watch(source, callback, options)

    registrations.set(id, {
      id,
      stop
    })

    // 返回停止函数
    return () => this.unregister(id)
  },

  /**
   * 注销watch
   */
  unregister: (id: string) => {
    const registration = registrations.get(id)
    if (registration) {
      registration.stop()
      registrations.delete(id)
    }
  },

  /**
   * 注销所有watch
   */
  clear: () => {
    registrations.forEach((registration) => {
      registration.stop()
    })
    registrations.clear()
  },

  /**
   * 获取已注册的watch数量
   */
  size: () => registrations.size,

  /**
   * 检查是否存在指定ID的watch
   */
  has: (id: string) => registrations.has(id)
}
