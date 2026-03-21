# 性能优化模块使用指南

## 概述

本模块为 `weilin-comfyui-tools` 项目提供了全面的性能优化解决方案,包含以下优化维度:

1. **LRU缓存** - 减少重复计算,提升缓存命中率
2. **动态防抖** - 根据输入速度自动调整防抖时间
3. **Watch优化** - 减少深度watch,使用浅层监听
4. **虚拟滚动** - 优化大规模列表渲染
5. **Web Worker** - 异步处理耗时操作
6. **批量更新** - 减少重渲染次数

## 快速开始

### 1. 导入模块

```typescript
import {
  cacheManager,
  debounceController,
  watchManager,
  webWorkerManager,
  batchUpdater,
  performanceMonitor
} from '@/utils/performance'
```

### 2. 使用缓存

```typescript
// 获取样式缓存
const styleCache = cacheManager.getCache('style')

// 设置缓存
styleCache.set('key', { width: '100px', height: '50px' })

// 获取缓存
const cached = styleCache.get('key')

// 查看缓存统计
const stats = cacheManager.getAllStats()
console.log('缓存命中率:', stats.style.hitRate)
```

### 3. 使用动态防抖

```typescript
import { createDynamicDebounce } from '@/utils/performance'

// 创建动态防抖函数
const debouncedFn = createDynamicDebounce(
  () => {
    // 你的处理逻辑
    console.log('执行防抖函数')
  },
  {
    minDelay: 100, // 最小延迟100ms
    maxDelay: 200, // 最大延迟200ms
    adaptive: true // 启用自适应
  }
)

// 调用防抖函数
debouncedFn()

// 取消待执行的防抖
debouncedFn.cancel()

// 立即执行
debouncedFn.flush()
```

### 4. 使用Watch优化

```typescript
import { watchManager } from '@/utils/performance'

// 注册浅层watch
watchManager.register(
  'my-watcher',
  () => myRef.value,
  (newValue, oldValue) => {
    console.log('值变化:', newValue)
  },
  { shallow: true }
)

// 手动触发更新
watchManager.triggerUpdate(myRef)

// 清理所有监听器
watchManager.cleanup()
```

### 5. 使用虚拟滚动

```vue
<template>
  <VirtualScrollContainer :items="items" :item-height="40" :buffer-size="5" :threshold="50">
    <template #default="{ item, index }">
      <div class="item">{{ item.text }}</div>
    </template>
  </VirtualScrollContainer>
</template>

<script setup>
  import VirtualScrollContainer from '@/utils/performance/virtual-scroll/VirtualScrollContainer.vue'
</script>
```

### 6. 使用Web Worker

```typescript
import { webWorkerManager } from '@/utils/performance'

// 初始化Worker
onMounted(() => {
  webWorkerManager.init('/src/workers/translator.worker.js')
})

// 发送翻译任务
const result = await webWorkerManager.postMessage({
  type: 'translate',
  data: {
    text: 'Hello',
    options: { to: 'zh' }
  }
})

// 清理Worker
onBeforeUnmount(() => {
  webWorkerManager.terminate()
})
```

### 7. 使用批量更新

```typescript
import { batchUpdater } from '@/utils/performance'

// 批量更新localStorage
batchUpdater.batchLocalStorage([
  { key: 'setting1', value: 'value1' },
  { key: 'setting2', value: 'value2' },
  { key: 'setting3', value: 'value3' }
])

// 批量更新Vue状态
await batchUpdater.batchVueState([
  { target: state, prop: 'prop1', value: newValue1 },
  { target: state, prop: 'prop2', value: newValue2 }
])
```

## 性能监控

### 查看性能报告

```typescript
import { performanceMonitor } from '@/utils/performance'

// 打印性能报告
performanceMonitor.printReport()

// 获取性能指标
const metrics = performanceMonitor.getMetrics()
console.log('缓存命中率:', metrics.cacheHitRate)
console.log('DOM节点数:', metrics.domNodeCount)
```

### 测量函数执行时间

```typescript
import { startTimer } from '@/utils/performance'

// 使用计时器
const timer = startTimer('数据处理')
await processData()
timer.end() // 自动打印耗时

// 使用装饰器
@measurePerformance('MyClass')
class MyClass {
  async myMethod() {
    // 自动测量执行时间
  }
}
```

## 配置选项

### 修改默认配置

```typescript
import { updateConfig } from '@/utils/performance'

updateConfig({
  debounce: {
    minDelay: 150,
    maxDelay: 300,
    adaptive: true
  },
  virtualScroll: {
    threshold: 100,
    bufferSize: 10,
    enabled: true
  },
  cache: {
    styleMaxSize: 30,
    translationMaxSize: 150,
    autocompleteMaxSize: 80,
    enabled: true
  }
})
```

### 使用优化开关

```typescript
import { optimizationToggles } from '@/utils/performance'

// 关闭虚拟滚动
optimizationToggles.virtualScroll = false

// 关闭Worker
optimizationToggles.worker = false

// 检查状态
if (optimizationToggles.cache) {
  console.log('缓存已启用')
}
```

## 集成到现有组件

详细的集成步骤请参考 `integration-guide.ts` 文件,其中包含了:

- Watch优化的具体代码示例
- 防抖优化的集成方法
- 虚拟滚动的使用方式
- 缓存优化的实现
- Worker的初始化和使用
- 批量更新的应用场景

## 性能指标

优化后的性能目标:

- ✅ 输入响应时间 ≤ 200ms
- ✅ 标签列表渲染时间 ≤ 300ms
- ✅ 滚动帧率 ≥ 60fps
- ✅ 缓存命中率 ≥ 70%
- ✅ 主线程阻塞时间 ≤ 50ms
- ✅ DOM节点减少 ≥ 80%

## 注意事项

1. **渐进式优化**: 可以逐个模块集成,观察效果后再继续
2. **功能保持**: 所有优化不影响现有功能
3. **回滚机制**: 每个优化模块都可以独立关闭
4. **性能监控**: 开发过程中持续监控性能指标
5. **代码审查**: 每个模块完成后进行代码审查

## 目录结构

```
src/utils/performance/
├── types.ts              # 类型定义
├── config.ts             # 配置管理
├── index.ts              # 主入口
├── integration-guide.ts  # 集成指南
├── monitor.ts            # 性能监控
├── cache/                # 缓存模块
│   ├── lru-cache.ts
│   └── cache-manager.ts
├── debounce/             # 防抖模块
│   ├── input-tracker.ts
│   ├── dynamic-debounce.ts
│   └── debounce-controller.ts
├── watch/                # Watch优化
│   └── watch-manager.ts
├── virtual-scroll/       # 虚拟滚动
│   ├── virtual-scroller.ts
│   └── VirtualScrollContainer.vue
├── worker/               # Web Worker
│   ├── worker-communication.ts
│   └── web-worker-manager.ts
└── batch/                # 批量更新
    └── batch-updater.ts
```

## 相关文档

- [需求规格文档](../../../.codeartsdoer/specs/vue-performance-optimization/spec.md)
- [设计文档](../../../.codeartsdoer/specs/vue-performance-optimization/design.md)
- [任务规划](../../../.codeartsdoer/specs/vue-performance-optimization/tasks.md)
