/**
 * Service Worker 管理器
 *
 * 处理Service Worker的注册、更新和状态管理。
 */

interface ServiceWorkerManagerOptions {
  onUpdate?: () => void
  onInstalled?: () => void
  onOffline?: () => void
  onOnline?: () => void
}

interface ServiceWorkerStatus {
  isSupported: boolean
  isRegistered: boolean
  isUpdateAvailable: boolean
  isOffline: boolean
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private options: ServiceWorkerManagerOptions = {}
  private status: ServiceWorkerStatus = {
    isSupported: false,
    isRegistered: false,
    isUpdateAvailable: false,
    isOffline: false
  }

  constructor() {
    this.status.isSupported = 'serviceWorker' in navigator
    this.status.isOffline = !navigator.onLine

    // 监听在线/离线状态
    window.addEventListener('online', () => {
      this.status.isOffline = false
      this.options.onOnline?.()
    })

    window.addEventListener('offline', () => {
      this.status.isOffline = true
      this.options.onOffline?.()
    })
  }

  /**
   * 注册Service Worker
   */
  async register(swPath = '/sw.js', options: ServiceWorkerManagerOptions = {}): Promise<boolean> {
    this.options = options

    if (!this.status.isSupported) {
      console.warn('[SWManager] Service Worker is not supported')
      return false
    }

    // 仅在生产环境注册
    if (import.meta.env?.DEV) {
      console.log('[SWManager] Skipping registration in development mode')
      return false
    }

    try {
      this.registration = await navigator.serviceWorker.register(swPath, {
        scope: '/extensions/weilin-comfyui-tools/'
      })

      this.status.isRegistered = true
      console.log('[SWManager] Service Worker registered:', this.registration.scope)

      // 监听更新
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 新版本已安装，提示用户更新
              this.status.isUpdateAvailable = true
              this.options.onUpdate?.()
            }
          })
        }
      })

      // 检查是否首次安装
      if (!navigator.serviceWorker.controller) {
        // 首次安装
        this.registration.addEventListener('install', () => {
          this.options.onInstalled?.()
        })
      }

      return true
    } catch (error) {
      // Service Worker 注册失败是可选功能,不影响主应用
      console.warn('[SWManager] Registration skipped (optional feature):', error)
      return false
    }
  }

  /**
   * 检查更新
   */
  async checkForUpdate(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      await this.registration.update()
      return true
    } catch (error) {
      console.error('[SWManager] Update check failed:', error)
      return false
    }
  }

  /**
   * 应用更新（刷新页面以激活新版本）
   */
  applyUpdate(): void {
    if (this.status.isUpdateAvailable) {
      // 发送消息给Service Worker，跳过等待
      if (this.registration?.waiting) {
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
      // 刷新页面
      window.location.reload()
    }
  }

  /**
   * 注销Service Worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return true
    }

    try {
      const result = await this.registration.unregister()
      if (result) {
        this.registration = null
        this.status.isRegistered = false
        console.log('[SWManager] Service Worker unregistered')
      }
      return result
    } catch (error) {
      console.error('[SWManager] Unregister failed:', error)
      return false
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    if (!this.registration?.active) {
      return
    }

    this.registration.active.postMessage('cleanup-cache')
  }

  /**
   * 获取状态
   */
  getStatus(): ServiceWorkerStatus {
    return { ...this.status }
  }

  /**
   * 是否支持Service Worker
   */
  isSupported(): boolean {
    return this.status.isSupported
  }

  /**
   * 是否已注册
   */
  isRegistered(): boolean {
    return this.status.isRegistered
  }

  /**
   * 是否有更新可用
   */
  hasUpdate(): boolean {
    return this.status.isUpdateAvailable
  }

  /**
   * 是否离线
   */
  isOffline(): boolean {
    return this.status.isOffline
  }
}

// 导出单例
export const serviceWorkerManager = new ServiceWorkerManager()
