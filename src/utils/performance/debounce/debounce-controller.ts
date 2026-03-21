/**
 * 动态防抖控制器
 *
 * 根据输入速度动态调整延迟时间，优化用户输入体验。
 * - 快速输入时使用较长延迟，避免频繁触发
 * - 慢速输入时使用较短延迟，提高响应速度
 */

interface DynamicDebounceOptions {
  minDelay?: number // 最小延迟时间（毫秒）
  maxDelay?: number // 最大延迟时间（毫秒）
  leading?: boolean // 是否在延迟开始前立即执行
  trailing?: boolean // 是否在延迟结束后执行
}

interface DebounceInstance {
  call: (...args: unknown[]) => void
  cancel: () => void
  flush: () => void
  pending: () => boolean
}

// 存储所有防抖实例，用于统一清理
const instances = new Set<DebounceInstance>()

/**
 * 创建动态防抖函数
 */
export function createDynamicDebounce<T extends(...args: unknown[]) => unknown>(
  fn: T,
  options: DynamicDebounceOptions = {}
): DebounceInstance {
  const {
    minDelay = 100,
    maxDelay = 300,
    leading = false,
    trailing = true
  } = options

  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastCallTime = 0
  let lastArgs: unknown[] | null = null
  let lastThis: unknown = null
  let result: unknown

  const instance: DebounceInstance = {
    call: function (this: unknown, ...args: unknown[]) {
      const now = Date.now()
      const timeSinceLastCall = now - lastCallTime

      // 根据输入间隔计算动态延迟
      // 输入间隔越短，延迟越长（快速输入）
      // 输入间隔越长，延迟越短（慢速输入）
      let delay: number
      if (lastCallTime === 0) {
        delay = minDelay
      } else {
        // 使用线性插值计算延迟
        // 输入间隔在 0-500ms 范围内，延迟从 maxDelay 线性变化到 minDelay
        const normalizedInterval = Math.min(timeSinceLastCall, 500) / 500
        delay = maxDelay - (maxDelay - minDelay) * normalizedInterval
      }

      lastCallTime = now
      lastArgs = args
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      lastThis = this

      // 清除之前的定时器
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }

      // leading 选项：在延迟开始前立即执行
      if (leading && timeoutId === null) {
        result = fn.apply(this, args)
      }

      // 设置新的定时器
      timeoutId = setTimeout(() => {
        timeoutId = null

        // trailing 选项：在延迟结束后执行
        if (trailing && lastArgs !== null) {
          result = fn.apply(lastThis, lastArgs)
          lastArgs = null
          lastThis = null
        }
      }, delay)
    },

    cancel: () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      lastArgs = null
      lastThis = null
    },

    flush: () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (lastArgs !== null) {
        result = fn.apply(lastThis, lastArgs)
        lastArgs = null
        lastThis = null
        return result
      }
    },

    pending: () => {
      return timeoutId !== null
    }
  }

  // 注册实例
  instances.add(instance)

  return instance
}

/**
 * 防抖控制器 - 统一管理所有防抖实例
 */
export const debounceController = {
  /**
   * 清除所有防抖实例
   */
  clear: () => {
    instances.forEach((instance) => {
      instance.cancel()
    })
  },

  /**
   * 立即执行所有待处理的防抖函数
   */
  flushAll: () => {
    instances.forEach((instance) => {
      instance.flush()
    })
  },

  /**
   * 获取待处理的防抖实例数量
   */
  pendingCount: () => {
    let count = 0
    instances.forEach((instance) => {
      if (instance.pending()) {
        count++
      }
    })
    return count
  },

  /**
   * 移除并清理指定实例
   */
  remove: (instance: DebounceInstance) => {
    instance.cancel()
    instances.delete(instance)
  }
}
