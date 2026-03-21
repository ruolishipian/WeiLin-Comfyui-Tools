# WeiLinPromptUI Lora同步问题修复总结

## 问题描述

WeiLinPromptUI节点的独立Lora堆窗口与提示词编辑器中的内嵌Lora堆存在同步问题:

1. **独立窗口清空编辑器数据**: 先打开提示词编辑器添加Lora,再打开独立Lora堆窗口时,编辑器中的数据被清空
2. **独立窗口无法同步到编辑器**: 在独立Lora堆窗口中添加/修改Lora,提示词编辑器中的Lora堆不会同步更新
3. **编辑器无法同步到独立窗口**: 在提示词编辑器中添加/修改Lora,独立Lora堆窗口不会同步更新

## 问题根本原因

### 架构差异

**独立Lora堆窗口** (`src/view/lora_manager/lora_stack.vue`):
- 自己管理`selectedLoras`状态 (`const selectedLoras = ref([])`)
- 通过watch监听状态变化,直接发送消息到节点
- 使用`updateLoraStackInfoToWindows()`函数发送`weilin_prompt_ui_prompt_node_finish_lora_stack_${seed}`消息

**提示词编辑器Lora堆** (`src/view/prompt_box/components/lora_stack.vue`):
- 通过props接收状态 (`props.selectedLoras`)
- 通过emit通知父组件更新 (`emit('update:selectedLoras')`)
- 父组件负责发送消息到节点

### 具体问题

1. **初始化问题**: 独立窗口的`initLoraStack`函数在数据为空时不清空`selectedLoras`,导致旧数据残留
2. **消息循环**: 独立窗口的watch会触发消息发送,但缺少机制避免循环更新
3. **状态管理混乱**: 两个组件使用不同的状态管理模式,导致数据流不清晰
4. **缺少seed**: 提示词编辑器Lora堆最初没有seed属性,无法监听节点更新消息

## 修复方案

### 方案一: 添加消息监听 (初步尝试)

**修改文件**: `src/view/prompt_box/components/lora_stack.vue`

1. 添加seed属性:
```javascript
const props = defineProps({
  selectedLoras: { type: Array, default: () => [] },
  seed: { type: String, default: '' }
})
```

2. 添加消息监听:
```javascript
window.addEventListener('message', (event) => {
  if (props.seed && event.data.type === `weilin_prompt_ui_prompt_node_finish_lora_stack_${props.seed}`) {
    const jsonStr = JSON.parse(event.data.data)
    if (jsonStr.temp_lora && jsonStr.temp_lora.length > 0) {
      emit('update:selectedLoras', jsonStr.temp_lora)
    }
  }
})
```

3. 父组件传递seed:
```vue
<LoraStack
  :seed="currentEditNodeId"
  :selected-loras="selectedLoras"
  @update:selected-loras="selectedLoras = $event"
/>
```

**问题**: 这种方式只是让提示词编辑器能接收独立窗口的更新,但没有解决根本的架构问题。

### 方案二: 重构独立窗口使用v-model模式 (最终方案)

**核心思想**: 让独立Lora堆窗口和提示词编辑器Lora堆使用完全相同的架构模式。

#### 修改文件1: `src/view/lora_manager/lora_stack.vue`

**关键改动**:

1. 将内部状态改为props:
```javascript
// 之前
const selectedLoras = ref([])
const seed = ref('')

// 之后
const props = defineProps({
  selectedLoras: { type: Array, default: () => [] },
  seed: { type: String, default: '' }
})
const emit = defineEmits(['update:selectedLoras'])
```

2. 修改addLora函数:
```javascript
// 之前
const addLora = (lora) => {
  selectedLoras.value.push({...lora})
}

// 之后
const addLora = (lora) => {
  const newLoras = [...props.selectedLoras, {...lora}]
  emit('update:selectedLoras', newLoras)
}
```

3. 删除watch和消息发送:
```javascript
// 删除
watch(selectedLoras, () => {
  updateLoraStackInfoToWindows()
}, { deep: true })

const updateLoraStackInfoToWindows = () => {
  window.postMessage({
    type: `weilin_prompt_ui_prompt_node_finish_lora_stack_${seed.value}`,
    data: JSON.stringify({...})
  }, '*')
}
```

4. 修改initLoraStack:
```javascript
const initLoraStack = (text, newSeed) => {
  // 不再直接设置seed,由父组件管理
  if (text.length > 0) {
    const jsonStr = JSON.parse(text)
    if (jsonStr.temp_lora) {
      emit('update:selectedLoras', jsonStr.temp_lora)
    }
  } else {
    emit('update:selectedLoras', [])
  }
}
```

#### 修改文件2: `src/view/lora_manager/lora_stack_only.vue`

应用与`lora_stack.vue`完全相同的重构逻辑。

#### 修改文件3: `src/App.vue`

**关键改动**:

1. 添加状态管理:
```javascript
const loraStackData = ref({
  selectedLoras: [],
  seed: ''
})

const loraStackOnlyData = ref({
  selectedLoras: [],
  seed: ''
})
```

2. 添加watch监听数据变化并发送消息:
```javascript
watch(
  () => loraStackData.value.selectedLoras,
  (newLoras) => {
    if (loraStackData.value.seed) {
      const tempLora = newLoras.filter((lora) => !lora.hidden)
      const putJson = {
        lora: tempLora.length > 0 ? tempLora : '',
        temp_lora: newLoras.length > 0 ? newLoras : []
      }
      window.postMessage({
        type: `weilin_prompt_ui_prompt_node_finish_lora_stack_${loraStackData.value.seed}`,
        data: JSON.stringify(putJson)
      }, '*')
    }
  },
  { deep: true }
)
```

3. 修改打开Lora堆窗口的逻辑:
```javascript
// 之前
windows.value.lora_stack_window.visible = true
waitForRef(loraStackRef, (ref) => {
  ref.initLoraStack(event.data.prompt, event.data.seed)
})

// 之后
loraStackData.value.seed = event.data.seed
if (event.data.prompt && event.data.prompt.length > 0) {
  const jsonStr = JSON.parse(event.data.prompt)
  loraStackData.value.selectedLoras = jsonStr.temp_lora || []
} else {
  loraStackData.value.selectedLoras = []
}
windows.value.lora_stack_window.visible = true
```

4. 添加v-model绑定:
```vue
<LoraStackWindow
  ref="loraStackRef"
  :selected-loras="loraStackData.selectedLoras"
  :seed="loraStackData.seed"
  @update:selected-loras="loraStackData.selectedLoras = $event"
  @update:seed="loraStackData.seed = $event"
/>
```

## 重构后的架构

### 统一的数据流

```
用户操作 → 组件emit → 父组件更新状态 → watch检测变化 → 发送消息到节点 → 节点更新数据 → 消息通知其他组件
```

### 所有Lora堆组件的统一模式

1. ✅ 通过props接收数据
2. ✅ 通过emit通知父组件更新
3. ✅ 父组件统一管理状态和消息发送
4. ✅ 组件只负责UI交互,不负责消息发送

## 重构的优势

1. **逻辑统一**: 所有Lora堆组件使用相同的架构,代码更易维护
2. **数据流清晰**: 单向数据流,易于追踪数据变化
3. **无循环更新**: 父组件统一发送消息,避免了组件间的循环更新
4. **易于扩展**: 新增Lora堆组件只需使用相同的模式
5. **初始化可控**: 父组件统一管理初始化逻辑,避免了数据残留问题

## 修复的问题

- ✅ 独立Lora堆窗口打开时不再清空编辑器数据
- ✅ 独立窗口的修改会同步到编辑器
- ✅ 编辑器的修改会同步到独立窗口
- ✅ 实现了真正的双向同步

## 触发词功能状态

经过检查,触发词相关的修复仍然存在,包括:

1. ✅ `app/server/prompt_api/trigger_words.py` - 统一触发词获取模块
2. ✅ `__init__.py` - `get_lora_trigger_words()` 函数调用新模块
3. ✅ `lora_info.py` - `_merge_metadata()` 按训练频率排序
4. ✅ `lora_info.py` - `_merge_civitai_data()` Civitai触发词优先

触发词获取优先级:
1. Civitai API (trainedWords) - 最高优先级
2. 元数据 ss_tag_frequency - 按训练频率排序
3. 元数据 ss_output_name
4. 文件名 - 最后回退

## 经验总结

1. **架构设计的重要性**: 统一的架构模式能避免很多同步问题
2. **状态管理的集中化**: 将状态管理集中到父组件,能更好地控制数据流
3. **单向数据流的优势**: 单向数据流使得数据变化更容易追踪和调试
4. **重构的价值**: 虽然重构费时,但能让系统更加清晰和易维护
5. **渐进式修复的局限性**: 小修小补往往治标不治本,需要从根本上解决问题