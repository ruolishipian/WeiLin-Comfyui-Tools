/**
 * Web Worker管理器
 *
 * 简化的Web Worker管理，用于后台任务处理
 */

interface WorkerTask {
  id: string
  resolve: (value: unknown) => void
  reject: (error: Error) => void
}

// 存储待处理的任务
const pendingTasks = new Map<string, WorkerTask>()

// 任务ID计数器
let taskIdCounter = 0

/**
 * Web Worker管理器（简化版）
 * 注：实际Web Worker需要单独的worker文件，这里提供管理接口
 */
export const webWorkerManager = {
  /**
   * 创建任务ID
   */
  createTaskId: (): string => {
    taskIdCounter++
    return `task-${taskIdCounter}-${Date.now()}`
  },

  /**
   * 注册任务
   */
  registerTask: (id: string, resolve: (value: unknown) => void, reject: (error: Error) => void) => {
    pendingTasks.set(id, {
      id,
      resolve,
      reject
    })
  },

  /**
   * 完成任务
   */
  completeTask: (id: string, result: unknown) => {
    const task = pendingTasks.get(id)
    if (task) {
      task.resolve(result)
      pendingTasks.delete(id)
    }
  },

  /**
   * 任务失败
   */
  failTask: (id: string, error: Error) => {
    const task = pendingTasks.get(id)
    if (task) {
      task.reject(error)
      pendingTasks.delete(id)
    }
  },

  /**
   * 取消任务
   */
  cancelTask: (id: string) => {
    pendingTasks.delete(id)
  },

  /**
   * 获取待处理任务数量
   */
  pendingCount: () => pendingTasks.size,

  /**
   * 清除所有任务
   */
  clear: () => {
    pendingTasks.clear()
  }
}
