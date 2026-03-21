<template>
  <div class="virtual-scroll-container" ref="containerRef" @scroll="handleScroll">
    <div class="virtual-scroll-spacer" :style="{ height: `${totalHeight}px` }">
      <div class="virtual-scroll-content" :style="{ transform: `translateY(${offsetY}px)` }">
        <div
          v-for="item in visibleItems"
          :key="item.id"
          class="virtual-scroll-item"
          :style="{ height: `${itemHeight}px` }"
        >
          <slot :item="item.data" :index="item.index"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted, watch, type PropType } from 'vue'

  const props = defineProps({
    items: {
      type: Array as PropType<unknown[]>,
      required: true
    },
    itemHeight: {
      type: Number,
      default: 40
    },
    bufferSize: {
      type: Number,
      default: 5
    },
    threshold: {
      type: Number,
      default: 50
    }
  })

  const containerRef = ref<HTMLElement | null>(null)
  const scrollTop = ref(0)
  const containerHeight = ref(0)

  // 计算总高度
  const totalHeight = computed(() => props.items.length * props.itemHeight)

  // 计算可见范围
  const visibleRange = computed(() => {
    const start = Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.bufferSize)
    const visibleCount = Math.ceil(containerHeight.value / props.itemHeight) + props.bufferSize * 2
    const end = Math.min(props.items.length, start + visibleCount)

    return { start, end }
  })

  // 计算偏移量
  const offsetY = computed(() => visibleRange.value.start * props.itemHeight)

  // 计算可见项
  const visibleItems = computed(() => {
    const { start, end } = visibleRange.value
    return props.items.slice(start, end).map((data, i) => ({
      id: (data as { id?: string })?.id ?? `item-${start + i}`,
      data,
      index: start + i
    }))
  })

  // 处理滚动
  const handleScroll = () => {
    if (containerRef.value) {
      scrollTop.value = containerRef.value.scrollTop
    }
  }

  // 更新容器高度
  const updateContainerHeight = () => {
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight
    }
  }

  // ResizeObserver
  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    updateContainerHeight()

    if (containerRef.value) {
      resizeObserver = new ResizeObserver(() => {
        updateContainerHeight()
      })
      resizeObserver.observe(containerRef.value)
    }
  })

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
  })

  // 监听items变化，重置滚动位置
  watch(
    () => props.items.length,
    () => {
      if (containerRef.value) {
        // 保持滚动位置在合理范围内
        const maxScrollTop = totalHeight.value - containerHeight.value
        if (scrollTop.value > maxScrollTop) {
          containerRef.value.scrollTop = Math.max(0, maxScrollTop)
        }
      }
    }
  )
</script>

<style scoped>
  .virtual-scroll-container {
    overflow-y: auto;
    position: relative;
    width: 100%;
    height: 100%;
  }

  .virtual-scroll-spacer {
    position: relative;
    width: 100%;
  }

  .virtual-scroll-content {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }

  .virtual-scroll-item {
    width: 100%;
    box-sizing: border-box;
  }
</style>
