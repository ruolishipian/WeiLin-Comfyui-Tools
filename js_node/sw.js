/**
 * Service Worker 离线缓存脚本
 *
 * 实现静态资源的离线缓存，使应用在离线状态下可访问核心功能。
 */

const CACHE_NAME = 'weilin-prompt-ui-v1'
const STATIC_CACHE_NAME = 'weilin-prompt-ui-static-v1'
const API_CACHE_NAME = 'weilin-prompt-ui-api-v1'

// 需要预缓存的静态资源
const PRECACHE_ASSETS = [
  '/extensions/weilin-comfyui-tools/',
  '/extensions/weilin-comfyui-tools/javascript/main.entry.js',
  '/extensions/weilin-comfyui-tools/style.css'
]

// 缓存策略配置
const CACHE_STRATEGIES = {
  // 静态资源：cache-first策略
  static: {
    cacheName: STATIC_CACHE_NAME,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    maxEntries: 100
  },
  // API请求：network-first策略
  api: {
    cacheName: API_CACHE_NAME,
    maxAge: 5 * 60 * 1000, // 5分钟
    maxEntries: 50
  }
}

/**
 * 判断请求是否为API请求
 */
function isApiRequest(request) {
  const url = new URL(request.url)
  return url.pathname.startsWith('/api/') || url.pathname.startsWith('/translate/')
}

/**
 * 判断请求是否为静态资源
 */
function isStaticRequest(request) {
  const url = new URL(request.url)
  return (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg')
  )
}

/**
 * Cache-first策略：优先从缓存获取，缓存未命中则从网络获取并缓存
 */
async function cacheFirst(request, options) {
  const cache = await caches.open(options.cacheName)

  // 尝试从缓存获取
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    // 检查是否过期
    const cachedTime = cachedResponse.headers.get('sw-cached-time')
    if (cachedTime) {
      const age = Date.now() - parseInt(cachedTime, 10)
      if (age < options.maxAge) {
        return cachedResponse
      }
    } else {
      return cachedResponse
    }
  }

  // 从网络获取
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      // 克隆响应并添加缓存时间戳
      const responseToCache = networkResponse.clone()
      const headers = new Headers(responseToCache.headers)
      headers.set('sw-cached-time', Date.now().toString())

      const cachedResponse = new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      })

      cache.put(request, cachedResponse)
    }
    return networkResponse
  } catch (error) {
    // 网络请求失败，返回缓存的响应（即使过期）
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

/**
 * Network-first策略：优先从网络获取，网络失败则从缓存获取
 */
async function networkFirst(request, options) {
  const cache = await caches.open(options.cacheName)

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      // 缓存响应
      const responseToCache = networkResponse.clone()
      const headers = new Headers(responseToCache.headers)
      headers.set('sw-cached-time', Date.now().toString())

      const cachedResponse = new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      })

      cache.put(request, cachedResponse)
    }
    return networkResponse
  } catch (error) {
    // 网络请求失败，尝试从缓存获取
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

/**
 * Stale-while-revalidate策略：立即返回缓存，同时后台更新缓存
 */
async function staleWhileRevalidate(request, options) {
  const cache = await caches.open(options.cacheName)

  // 从缓存获取
  const cachedResponse = await cache.match(request)

  // 发起网络请求更新缓存
  const fetchPromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        const responseToCache = networkResponse.clone()
        const headers = new Headers(responseToCache.headers)
        headers.set('sw-cached-time', Date.now().toString())

        const cachedResponse = new Response(await responseToCache.blob(), {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers
        })

        cache.put(request, cachedResponse)
      }
      return networkResponse
    })
    .catch(() => {
      // 网络请求失败，忽略
      return null
    })

  // 如果有缓存，立即返回
  if (cachedResponse) {
    return cachedResponse
  }

  // 否则等待网络请求
  return fetchPromise
}

/**
 * 清理过期缓存
 */
async function cleanupCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()

  if (keys.length > maxEntries) {
    // 按缓存时间排序，删除最旧的
    const entries = await Promise.all(
      keys.map(async (request) => {
        const response = await cache.match(request)
        const cachedTime = response?.headers.get('sw-cached-time') || '0'
        return { request, time: parseInt(cachedTime, 10) }
      })
    )

    entries.sort((a, b) => a.time - b.time)

    const toDelete = entries.slice(0, keys.length - maxEntries)
    await Promise.all(toDelete.map(({ request }) => cache.delete(request)))
  }
}

// Service Worker 安装事件
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker')

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching static assets')
        return cache.addAll(PRECACHE_ASSETS)
      })
      .then(() => {
        // 跳过等待，立即激活
        return self.skipWaiting()
      })
  )
})

// Service Worker 激活事件
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker')

  event.waitUntil(
    // 清理旧版本缓存
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name !== CACHE_NAME && name !== STATIC_CACHE_NAME && name !== API_CACHE_NAME
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      })
      .then(() => {
        // 立即控制所有客户端
        return self.clients.claim()
      })
  )
})

// Service Worker 请求拦截
self.addEventListener('fetch', (event) => {
  const request = event.request

  // 只处理GET请求
  if (request.method !== 'GET') {
    return
  }

  // 根据请求类型选择缓存策略
  if (isApiRequest(request)) {
    // API请求：network-first
    event.respondWith(
      networkFirst(request, CACHE_STRATEGIES.api).catch(() => {
        // 返回离线响应
        return new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      })
    )
  } else if (isStaticRequest(request)) {
    // 静态资源：cache-first
    event.respondWith(cacheFirst(request, CACHE_STRATEGIES.static))
  } else {
    // 其他请求：stale-while-revalidate
    event.respondWith(
      staleWhileRevalidate(request, CACHE_STRATEGIES.static).catch(() => {
        return fetch(request)
      })
    )
  }
})

// 定期清理缓存
self.addEventListener('message', (event) => {
  if (event.data === 'cleanup-cache') {
    event.waitUntil(
      Promise.all([
        cleanupCache(STATIC_CACHE_NAME, CACHE_STRATEGIES.static.maxEntries),
        cleanupCache(API_CACHE_NAME, CACHE_STRATEGIES.api.maxEntries)
      ])
    )
  }
})

console.log('[SW] Service Worker loaded')
