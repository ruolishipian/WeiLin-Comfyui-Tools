# Lora同步方案 - 独立窗口提示词文本同步

## 方案概述

本方案旨在实现独立Lora堆窗口修改Lora时，能够同步更新节点的提示词文本框中的 `<wlr:...>` 标签，确保用户能够实时看到Lora标签的变化。

### 目标

1. ✅ 独立窗口修改Lora时，节点的提示词文本框实时更新
2. ✅ 用户能够在节点上看到Lora标签的添加/删除/权重变化
3. ✅ 保持与编辑器相同的处理逻辑和用户体验
4. ✅ 不影响用户在节点提示词文本框中输入的其他内容

### 责任分工

- **独立窗口**：负责构建Lora标签，发送消息到节点
- **节点**：负责接收消息，使用与编辑器相同的逻辑处理提示词文本
- **编辑器**：保持现有逻辑不变

---

## 当前问题

### 问题描述

独立Lora堆窗口修改Lora时：
- ✅ 节点的Lora数据文本框会更新
- ❌ 节点的提示词文本框不会更新
- ❌ 用户无法看到Lora标签的变化
- ❌ 用户无法确认Lora是否真的添加成功

### 问题影响

1. 编辑器未打开时，用户看不到Lora标签的变化
2. 用户无法确认Lora操作是否成功
3. 节点的提示词文本框与Lora数据不同步

---

## 解决方案

### 核心思路

独立窗口修改Lora时，发送两个消息到节点：
1. `weilin_prompt_ui_prompt_node_finish_lora_stack_${seed}` - 更新Lora数据
2. `weilin_prompt_ui_update_lora_tags_${seed}` - 更新提示词文本

节点使用与编辑器相同的逻辑处理提示词文本：
- 使用正则表达式删除所有 `<wlr:...>` 标签
- 清理格式（连续逗号、空格）
- 添加新的Lora标签到开头

---

## 实施方案

### 修改1：独立窗口 - 发送Lora标签消息

**文件：** `src/view/lora_manager/lora_stack.vue`

**修改位置：** `updateLoraStackInfoToWindows` 函数

**修改内容：**

```javascript
const updateLoraStackInfoToWindows = () => {
  // 1. 更新Lora数据
  const tempLora = selectedLoras.value.filter((lora) => !lora.hidden)
  const putJson = {
    lora: tempLora.length > 0 ? tempLora : '',
    temp_lora: selectedLoras.value.length > 0 ? selectedLoras.value : []
  }
  const jsonStr = JSON.stringify(putJson)
  
  // 发送Lora数据到节点
  window.postMessage(
    {
      type: `weilin_prompt_ui_prompt_node_finish_lora_stack_${seed.value}`,
      data: jsonStr
    },
    '*'
  )
  
  // 2. 发送Lora标签到节点（新增）
  const loraTags = tempLora.map((lora) => {
    const loraName = lora.lora ? lora.lora.replace('.safetensors', '') : lora.name
    return `<wlr:${loraName}:${lora.weight || 1}:${lora.text_encoder_weight || 1}:${lora.trigger_weight || 1}>`
  })
  
  window.postMessage(
    {
      type: `weilin_prompt_ui_update_lora_tags_${seed.value}`,
      tags: loraTags
    },
    '*'
  )
}
```

---

### 修改2：节点 - 处理Lora标签消息

**文件：** `js_node/weilin_prompt_ui_node.js`

**修改位置：** 消息处理器中，在 `weilin_prompt_ui_prompt_node_finish_lora_stack_` 处理之后

**新增代码：**

```javascript
else if (event.data.type === `weilin_prompt_ui_update_lora_tags_${thisNodeSeed}`) {
  // 处理来自独立窗口的Lora标签更新消息
  const loraTags = event.data.tags
  const currentPrompt = nodeTextAreaList[0].value
  
  // 使用与编辑器相同的逻辑处理提示词文本
  if (loraTags && loraTags.length > 0) {
    // 移除所有现有的 <wlr:...> 标签
    const wlrPattern = /<wlr:[^>]+>/g
    let cleanText = currentPrompt.replace(wlrPattern, '')
    
    // 清理连续的逗号和空格
    cleanText = cleanText
      .replace(/,\s*,/g, ',')      // 连续逗号替换为单个逗号
      .replace(/,\s*$/g, '')       // 移除末尾的逗号和空格
      .replace(/^\s*,/g, '')       // 移除开头的逗号和空格
      .trim()
    
    // 添加新的标签到开头
    const newTags = loraTags.join(', ')
    if (cleanText) {
      nodeTextAreaList[0].value = `${newTags}, ${cleanText}`
    } else {
      nodeTextAreaList[0].value = newTags
    }
  } else {
    // 当 loraTags 为空数组时，清空提示词中的所有 LoRA 标签
    const wlrPattern = /<wlr:[^>]+>/g
    let cleanText = currentPrompt.replace(wlrPattern, '')
    
    // 清理连续的逗号和空格
    cleanText = cleanText
      .replace(/,\s*,/g, ',')
      .replace(/,\s*$/g, '')
      .replace(/^\s*,/g, '')
      .trim()
    
    nodeTextAreaList[0].value = cleanText
  }
  
  // 同步更新Widget
  if (nodeWidgetList[0]) nodeWidgetList[0].value = nodeTextAreaList[0].value
}
```

---

## 数据流程

### 场景1：独立窗口添加Lora（编辑器未打开）

```
用户在独立窗口添加Lora
    ↓
独立窗口watch触发
    ↓
updateLoraStackInfoToWindows() 发送两个消息：
  1. weilin_prompt_ui_prompt_node_finish_lora_stack_${seed}
  2. weilin_prompt_ui_update_lora_tags_${seed}（新增）
    ↓
节点接收消息：
  1. 更新 nodeTextAreaList[1] 和 nodeTextAreaList[3]（Lora数据）
  2. 处理 nodeTextAreaList[0]（提示词文本）：
     - 删除所有 <wlr:...> 标签
     - 清理格式
     - 添加新的Lora标签
    ↓
✅ 节点的Lora数据文本框已更新
✅ 节点的提示词文本框已更新
✅ 用户可以看到Lora标签的变化
```

### 场景2：独立窗口添加Lora（编辑器已打开）

```
用户在独立窗口添加Lora
    ↓
独立窗口watch触发
    ↓
updateLoraStackInfoToWindows() 发送两个消息
    ↓
节点接收消息并更新数据
    ↓
节点广播消息：weilin_prompt_ui_prompt_node_finish_lora_stack_${seed}
    ↓
编辑器接收广播，更新内嵌Lora堆
    ↓
编辑器watch触发，发送 weilin_prompt_ui_update_lora_tags 消息
    ↓
编辑器更新自己的提示词文本框
    ↓
编辑器调用 postMessageToWindowsPrompt() 同步到节点
    ↓
✅ 节点的Lora数据文本框已更新
✅ 节点的提示词文本框已更新（两次更新，但结果一致）
✅ 编辑器的提示词文本框已更新
✅ 用户可以看到Lora标签的变化
```

### 场景3：独立窗口删除所有Lora

```
用户在独立窗口删除所有Lora
    ↓
独立窗口watch触发
    ↓
updateLoraStackInfoToWindows() 发送两个消息：
  1. lora: '', temp_lora: []
  2. tags: []（空数组）
    ↓
节点接收消息：
  1. 清空 nodeTextAreaList[1] 和 nodeTextAreaList[3]
  2. 处理 nodeTextAreaList[0]：
     - 删除所有 <wlr:...> 标签
     - 清理格式
     - 不添加新标签
    ↓
✅ 节点的提示词文本框中所有Lora标签已删除
✅ 提示词中的其他内容保留
```

---

## 同步状态总结

| 场景 | 节点Lora数据文本框 | 节点提示词文本框 | 编辑器内嵌Lora堆 | 编辑器提示词文本 | 独立窗口 |
|------|-----------------|----------------|----------------|----------------|---------|
| 打开编辑器 | ✅ 已有数据 | ✅ 已有数据 | ✅ 查询同步 | ✅ 从节点获取 | - |
| 独立窗口添加Lora（编辑器未打开） | ✅ 同步 | ✅ 同步（新增） | - | - | - |
| 独立窗口添加Lora（编辑器已打开） | ✅ 同步 | ✅ 同步（新增） | ✅ 广播同步 | ✅ 广播同步 | - |
| 独立窗口删除Lora（编辑器未打开） | ✅ 同步 | ✅ 同步（新增） | - | - | - |
| 独立窗口删除Lora（编辑器已打开） | ✅ 同步 | ✅ 同步（新增） | ✅ 广播同步 | ✅ 广播同步 | - |
| 编辑器修改Lora | ✅ 同步 | ✅ 同步 | - | - | ✅ 广播同步 |

---

## 技术细节

### Lora标签格式

```
<wlr:lora名称:模型权重:文本编码器权重:触发词权重>
```

示例：
```
<wlr:anime_lineart:1:1:1>, <wlr:detail_tweaker:0.8:0.8:0.8>
```

### 正则表达式

```javascript
const wlrPattern = /<wlr:[^>]+>/g
```

匹配所有 `<wlr:...>` 标签。

### 格式清理

```javascript
cleanText = cleanText
  .replace(/,\s*,/g, ',')      // 连续逗号替换为单个逗号
  .replace(/,\s*$/g, '')       // 移除末尾的逗号和空格
  .replace(/^\s*,/g, '')       // 移除开头的逗号和空格
  .trim()
```

---

## 优势

1. **用户体验提升**：用户能够实时看到Lora标签的变化
2. **操作反馈明确**：用户可以确认Lora操作是否成功
3. **逻辑统一**：使用与编辑器相同的处理逻辑
4. **不干扰其他内容**：只处理Lora标签，不影响其他提示词
5. **简单可靠**：使用成熟的正则替换机制

---

## 注意事项

1. **消息顺序**：先发送Lora数据消息，再发送Lora标签消息
2. **格式统一**：Lora标签格式必须与编辑器一致
3. **空数组处理**：tags为空数组时，清空所有Lora标签
4. **隐藏Lora过滤**：只处理未隐藏的Lora（hidden=false）
5. **权重默认值**：确保所有权重都有默认值（默认为1）

---

## 测试场景

### 测试1：添加单个Lora

**操作：** 在独立窗口添加一个Lora

**预期结果：**
- 节点的Lora数据文本框更新
- 节点的提示词文本框显示 `<wlr:lora1:1:1:1>`
- 如果编辑器已打开，编辑器同步更新

### 测试2：添加多个Lora

**操作：** 在独立窗口添加多个Lora

**预期结果：**
- 节点的提示词文本框显示多个Lora标签，用逗号分隔
- 格式：`<wlr:lora1:1:1:1>, <wlr:lora2:1:1:1>, <wlr:lora3:1:1:1>`

### 测试3：删除Lora

**操作：** 在独立窗口删除一个Lora

**预期结果：**
- 节点的提示词文本框中对应的Lora标签被删除
- 其他Lora标签保留
- 格式清理正确（无多余逗号）

### 测试4：删除所有Lora

**操作：** 在独立窗口删除所有Lora

**预期结果：**
- 节点的提示词文本框中所有Lora标签被删除
- 提示词中的其他内容保留

### 测试5：修改Lora权重

**操作：** 在独立窗口修改Lora权重

**预期结果：**
- 节点的提示词文本框中对应的Lora标签权重更新
- 格式：`<wlr:lora1:0.8:1:1>`（权重从1变为0.8）

### 测试6：隐藏Lora

**操作：** 在独立窗口隐藏一个Lora

**预期结果：**
- 节点的提示词文本框中对应的Lora标签被删除
- 节点的Lora数据文本框中该Lora保留（hidden=true）

### 测试7：编辑器未打开时操作

**操作：** 独立窗口添加Lora，编辑器未打开

**预期结果：**
- 节点的提示词文本框更新
- 用户能够看到Lora标签的变化
- 下次打开编辑器时，数据正确同步

### 测试8：提示词中有其他内容

**操作：** 节点的提示词文本框中已有其他提示词，独立窗口添加Lora

**预期结果：**
- 节点的提示词文本框格式：`<wlr:lora1:1:1:1>, beautiful girl, sunset`
- Lora标签在开头，其他内容保留

---

## 与现有方案的兼容性

### 现有方案

1. **查询机制**：组件打开时主动查询节点获取最新数据
2. **广播机制**：数据变化时节点广播消息给其他组件
3. **编辑器同步**：编辑器修改Lora时同步到节点

### 新增方案

1. **独立窗口提示词同步**：独立窗口修改Lora时同步节点的提示词文本
2. **节点处理逻辑**：节点使用与编辑器相同的逻辑处理提示词文本

### 兼容性

- ✅ 不影响现有的查询机制
- ✅ 不影响现有的广播机制
- ✅ 不影响编辑器的现有逻辑
- ✅ 不影响独立窗口的现有功能
- ✅ 只添加新的消息类型和处理逻辑

---

## 实施步骤

### 步骤1：修改独立窗口

**文件：** `src/view/lora_manager/lora_stack.vue`

**修改：** 在 `updateLoraStackInfoToWindows` 函数中添加发送Lora标签消息的逻辑

### 步骤2：修改节点

**文件：** `js_node/weilin_prompt_ui_node.js`

**修改：** 在消息处理器中添加处理 `weilin_prompt_ui_update_lora_tags_${seed}` 消息的逻辑

### 步骤3：测试验证

**测试场景：**
- 添加单个Lora
- 添加多个Lora
- 删除Lora
- 修改Lora权重
- 隐藏Lora
- 编辑器未打开时操作
- 提示词中有其他内容

---

## 回滚方案

如果出现问题，可以快速回滚：

### 回滚步骤1：独立窗口

**文件：** `src/view/lora_manager/lora_stack.vue`

**回滚：** 删除 `updateLoraStackInfoToWindows` 函数中新增的发送Lora标签消息的代码

### 回滚步骤2：节点

**文件：** `js_node/weilin_prompt_ui_node.js`

**回滚：** 删除新增的 `weilin_prompt_ui_update_lora_tags_${seed}` 消息处理逻辑

---

## 总结

本方案通过在独立窗口修改Lora时发送Lora标签消息到节点，并让节点使用与编辑器相同的逻辑处理提示词文本，实现了独立窗口与节点提示词文本的同步。

**核心优势：**
- ✅ 用户能够实时看到Lora标签的变化
- ✅ 操作反馈明确
- ✅ 逻辑统一
- ✅ 不干扰其他内容
- ✅ 与现有方案兼容

**实施难度：** 低
**风险等级：** 低
**测试覆盖：** 高

---

## 附录

### 相关文件

1. `src/view/lora_manager/lora_stack.vue` - 独立Lora堆窗口组件
2. `js_node/weilin_prompt_ui_node.js` - 节点消息处理器
3. `src/view/prompt_box/prompt_index.vue` - 编辑器组件（参考实现）

### 相关消息类型

1. `weilin_prompt_ui_prompt_node_finish_lora_stack_${seed}` - 更新Lora数据
2. `weilin_prompt_ui_update_lora_tags_${seed}` - 更新提示词文本（新增）
3. `weilin_prompt_ui_query_lora_stack_${seed}` - 查询Lora数据
4. `weilin_prompt_ui_prompt_finish_prompt` - 编辑器同步提示词到节点

### 相关函数

1. `updateLoraStackInfoToWindows()` - 独立窗口更新Lora信息
2. `postMessageToWindowsPrompt()` - 编辑器同步提示词到节点
