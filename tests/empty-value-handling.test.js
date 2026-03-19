/**
 * 空值处理逻辑单元测试 - 完整版
 * 测试所有空值场景，确保数据正确处理
 * 
 * 覆盖场景：
 * 1. 独立 Lora 堆窗口 (lora_stack.vue)
 * 2. 提示词编辑器内 Lora 堆 (prompt_index.vue)
 * 3. 节点端消息处理 (weilin_prompt_ui_node.js)
 * 4. 端到端数据同步
 * 
 * 运行方式: node tests/empty-value-handling.test.js
 */

// ============================================
// 测试工具函数
// ============================================

let passCount = 0;
let failCount = 0;
const testResults = [];

function test(name, fn) {
  try {
    fn();
    passCount++;
    testResults.push({ name, status: 'PASS', error: null });
    console.log(`✅ PASS: ${name}`);
  } catch (error) {
    failCount++;
    testResults.push({ name, status: 'FAIL', error: error.message });
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

function assertEqual(actual, expected, message = '') {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}\n   Expected: ${expectedStr}\n   Actual: ${actualStr}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(message || 'Expected true but got false');
  }
}

function assertFalse(condition, message = '') {
  if (condition) {
    throw new Error(message || 'Expected false but got true');
  }
}

// ============================================
// 核心处理函数（从代码中提取的逻辑）
// ============================================

/**
 * 处理 Lora 数组数据
 * 对应代码: if (jsonReponse.lora && Array.isArray(jsonReponse.lora) && jsonReponse.lora.length > 0)
 */
function processLoraData(lora) {
  if (lora && Array.isArray(lora) && lora.length > 0) {
    return JSON.stringify(lora);
  }
  return "";
}

/**
 * 处理 temp_lora 数组数据
 * 对应代码: if (jsonReponse.temp_lora && Array.isArray(jsonReponse.temp_lora))
 */
function processTempLoraData(tempLora) {
  if (tempLora && Array.isArray(tempLora)) {
    return JSON.stringify(tempLora);
  }
  return "";
}

/**
 * 处理 temp_prompt 对象数据
 * 对应代码: if (jsonReponse.temp_prompt && (typeof jsonReponse.temp_prompt === 'object') && Object.keys(jsonReponse.temp_prompt).length > 0)
 */
function processTempPromptData(tempPrompt) {
  if (tempPrompt && (typeof tempPrompt === 'object') && Object.keys(tempPrompt).length > 0) {
    return JSON.stringify(tempPrompt);
  }
  return "";
}

// --------------------------------------------
// 场景1: 独立 Lora 堆窗口 (lora_stack.vue)
// --------------------------------------------

/**
 * Vue 端更新 Lora 堆数据的函数
 * 对应 src/view/lora_manager/lora_stack.vue 中的 updateLoraStackInfoToWindows
 */
function updateLoraStackInfoToWindows(selectedLoras) {
  const tempLora = selectedLoras.filter((lora) => !lora.hidden);
  const putJson = {
    lora: tempLora.length > 0 ? tempLora : '',
    temp_lora: selectedLoras.length > 0 ? selectedLoras : []
  };
  return JSON.stringify(putJson);
}

/**
 * 节点端处理接收到的 Lora 堆数据
 * 对应 js_node/weilin_prompt_ui_node.js 中的消息处理
 */
function handleLoraStackMessage(data) {
  const jsonReponse = JSON.parse(data);
  const result = {
    lora: "",
    temp_lora: ""
  };
  
  // 处理 lora 数据
  if (jsonReponse.lora && Array.isArray(jsonReponse.lora) && jsonReponse.lora.length > 0) {
    result.lora = JSON.stringify(jsonReponse.lora);
  }
  
  // 处理 temp_lora 数据 - 支持空数组
  if (jsonReponse.temp_lora && Array.isArray(jsonReponse.temp_lora)) {
    result.temp_lora = JSON.stringify(jsonReponse.temp_lora);
  }
  
  return result;
}

// --------------------------------------------
// 场景2: 提示词编辑器内 Lora 堆 (prompt_index.vue)
// --------------------------------------------

/**
 * 提示词编辑器的 finishPromptPutItHistory 函数
 * 对应 src/view/prompt_box/prompt_index.vue
 */
function finishPromptPutItHistory(inputText, selectedLoras, tokens) {
  const trimmedInput = inputText.replace(/[\s\t\n]+/g, '');
  
  if (selectedLoras.length > 0) {
    if (trimmedInput.length > 0) {
      const tempLora = selectedLoras.filter((lora) => !lora.hidden);
      const putJson = {
        prompt: inputText,
        lora: tempLora.length > 0 ? tempLora : '',
        temp_prompt: tokens,
        temp_lora: selectedLoras
      };
      return JSON.stringify(putJson);
    }
  } else {
    if (trimmedInput.length > 0) {
      const putJson = {
        prompt: inputText,
        lora: '',
        temp_prompt: tokens,
        temp_lora: []  // 修复后：使用空数组
      };
      return JSON.stringify(putJson);
    }
  }
  return null;
}

/**
 * 提示词编辑器的 postMessageToWindowsPrompt 函数
 * 对应 src/view/prompt_box/prompt_index.vue
 */
function postMessageToWindowsPrompt(inputText, selectedLoras, tokens) {
  const tempLora = selectedLoras.filter((lora) => !lora.hidden);
  const putJson = {
    prompt: inputText,
    lora: tempLora.length > 0 ? tempLora : '',
    temp_prompt: tokens,
    temp_lora: selectedLoras.length > 0 ? selectedLoras : []  // 修复后：使用空数组
  };
  return JSON.stringify(putJson);
}

/**
 * 节点端处理提示词更新消息
 * 对应 js_node/weilin_prompt_ui_node.js 中的 weilin_prompt_ui_prompt_update_prompt_ 消息处理
 */
function handlePromptUpdateMessage(data) {
  const jsonReponse = JSON.parse(data);
  const result = {
    prompt: jsonReponse.prompt || "",
    lora: "",
    temp_prompt: "",
    temp_lora: ""
  };
  
  // 处理 lora 数据
  if (jsonReponse.lora && Array.isArray(jsonReponse.lora) && jsonReponse.lora.length > 0) {
    result.lora = JSON.stringify(jsonReponse.lora);
  }
  
  // 处理 temp_prompt 数据
  if (jsonReponse.temp_prompt && (typeof jsonReponse.temp_prompt === 'object') && Object.keys(jsonReponse.temp_prompt).length > 0) {
    result.temp_prompt = JSON.stringify(jsonReponse.temp_prompt);
  }
  
  // 处理 temp_lora 数据 - 支持空数组
  if (jsonReponse.temp_lora && Array.isArray(jsonReponse.temp_lora)) {
    result.temp_lora = JSON.stringify(jsonReponse.temp_lora);
  }
  
  return result;
}

// --------------------------------------------
// 场景3: 内嵌 Lora 堆组件 (lora_stack.vue in prompt_box)
// --------------------------------------------

/**
 * 内嵌 Lora 堆的 removeLora 函数
 * 对应 src/view/prompt_box/components/lora_stack.vue
 */
function removeLoraFromEmbeddedStack(selectedLoras, loraToRemove) {
  const index = selectedLoras.findIndex((item) => item.name === loraToRemove.name);
  if (index > -1) {
    return selectedLoras.filter((_, i) => i !== index);
  }
  return selectedLoras;
}

/**
 * 内嵌 Lora 堆的 watch 回调，发送 weilin_prompt_ui_update_lora_tags 消息
 */
function updateLoraTags(selectedLoras) {
  if (selectedLoras && selectedLoras.length > 0) {
    const visibleLoras = selectedLoras.filter((lora) => !lora.hidden);
    const loraTags = visibleLoras.map((lora) => {
      const loraName = lora.lora ? lora.lora.replace('.safetensors', '') : lora.name;
      return `<wlr:${loraName}:${lora.weight || 1}:${lora.text_encoder_weight || 1}:${lora.trigger_weight || 1}>`;
    });
    return loraTags;
  }
  return [];
}

// ============================================
// 测试用例
// ============================================

console.log('\n============================================');
console.log('空值处理逻辑单元测试 - 完整版');
console.log('============================================\n');

// --------------------------------------------
// 测试 processLoraData 函数
// --------------------------------------------
console.log('\n--- 测试 processLoraData 函数 ---\n');

test('processLoraData: 正常数组', () => {
  const lora = [{ name: 'lora1', weight: 1 }];
  const result = processLoraData(lora);
  assertEqual(result, JSON.stringify(lora));
});

test('processLoraData: 空数组', () => {
  const result = processLoraData([]);
  assertEqual(result, "");
});

test('processLoraData: null', () => {
  const result = processLoraData(null);
  assertEqual(result, "");
});

test('processLoraData: undefined', () => {
  const result = processLoraData(undefined);
  assertEqual(result, "");
});

test('processLoraData: 空字符串', () => {
  const result = processLoraData("");
  assertEqual(result, "");
});

test('processLoraData: 对象（非数组）', () => {
  const result = processLoraData({ name: 'lora1' });
  assertEqual(result, "");
});

// --------------------------------------------
// 测试 processTempLoraData 函数
// --------------------------------------------
console.log('\n--- 测试 processTempLoraData 函数 ---\n');

test('processTempLoraData: 正常数组', () => {
  const tempLora = [{ name: 'lora1', weight: 1 }];
  const result = processTempLoraData(tempLora);
  assertEqual(result, JSON.stringify(tempLora));
});

test('processTempLoraData: 空数组（关键测试）', () => {
  const result = processTempLoraData([]);
  assertEqual(result, "[]");
});

test('processTempLoraData: null', () => {
  const result = processTempLoraData(null);
  assertEqual(result, "");
});

test('processTempLoraData: undefined', () => {
  const result = processTempLoraData(undefined);
  assertEqual(result, "");
});

test('processTempLoraData: 空字符串', () => {
  const result = processTempLoraData("");
  assertEqual(result, "");
});

// --------------------------------------------
// 测试 processTempPromptData 函数
// --------------------------------------------
console.log('\n--- 测试 processTempPromptData 函数 ---\n');

test('processTempPromptData: 正常对象', () => {
  const tempPrompt = { key: 'value' };
  const result = processTempPromptData(tempPrompt);
  assertEqual(result, JSON.stringify(tempPrompt));
});

test('processTempPromptData: 空对象', () => {
  const result = processTempPromptData({});
  assertEqual(result, "");
});

test('processTempPromptData: null', () => {
  const result = processTempPromptData(null);
  assertEqual(result, "");
});

test('processTempPromptData: undefined', () => {
  const result = processTempPromptData(undefined);
  assertEqual(result, "");
});

// --------------------------------------------
// 场景1: 独立 Lora 堆窗口测试
// --------------------------------------------
console.log('\n--- 场景1: 独立 Lora 堆窗口 (lora_stack.vue) ---\n');

test('场景1 - updateLoraStackInfoToWindows: 正常数据', () => {
  const selectedLoras = [{ name: 'lora1', weight: 1, hidden: false }];
  const result = JSON.parse(updateLoraStackInfoToWindows(selectedLoras));
  assertEqual(result.lora.length, 1);
  assertEqual(result.temp_lora.length, 1);
});

test('场景1 - updateLoraStackInfoToWindows: 空数组（关键测试）', () => {
  const result = JSON.parse(updateLoraStackInfoToWindows([]));
  assertEqual(result.lora, "");
  assertEqual(result.temp_lora, []);
});

test('场景1 - handleLoraStackMessage: 正常数据', () => {
  const data = JSON.stringify({
    lora: [{ name: 'lora1', weight: 1 }],
    temp_lora: [{ name: 'lora1', weight: 1 }]
  });
  const result = handleLoraStackMessage(data);
  assertTrue(result.lora.length > 0);
  assertTrue(result.temp_lora.length > 0);
});

test('场景1 - handleLoraStackMessage: 空数组（关键测试）', () => {
  const data = JSON.stringify({
    lora: '',
    temp_lora: []
  });
  const result = handleLoraStackMessage(data);
  assertEqual(result.lora, "");
  assertEqual(result.temp_lora, "[]");
});

test('场景1 - 端到端: 空数组同步', () => {
  const selectedLoras = [];
  const sentData = updateLoraStackInfoToWindows(selectedLoras);
  const receivedResult = handleLoraStackMessage(sentData);
  assertEqual(receivedResult.temp_lora, "[]");
});

// --------------------------------------------
// 场景2: 提示词编辑器内 Lora 堆测试
// --------------------------------------------
console.log('\n--- 场景2: 提示词编辑器内 Lora 堆 (prompt_index.vue) ---\n');

test('场景2 - finishPromptPutItHistory: 正常数据', () => {
  const inputText = "test prompt";
  const selectedLoras = [{ name: 'lora1', weight: 1, hidden: false }];
  const tokens = [{ text: "test" }];
  const result = JSON.parse(finishPromptPutItHistory(inputText, selectedLoras, tokens));
  assertEqual(result.prompt, inputText);
  assertEqual(result.temp_lora.length, 1);
});

test('场景2 - finishPromptPutItHistory: 空 Lora 数组（关键测试）', () => {
  const inputText = "test prompt";
  const selectedLoras = [];
  const tokens = [{ text: "test" }];
  const result = JSON.parse(finishPromptPutItHistory(inputText, selectedLoras, tokens));
  assertEqual(result.prompt, inputText);
  assertEqual(result.temp_lora, []);  // 关键：应该是空数组，不是空字符串
});

test('场景2 - postMessageToWindowsPrompt: 正常数据', () => {
  const inputText = "test prompt";
  const selectedLoras = [{ name: 'lora1', weight: 1, hidden: false }];
  const tokens = [{ text: "test" }];
  const result = JSON.parse(postMessageToWindowsPrompt(inputText, selectedLoras, tokens));
  assertEqual(result.prompt, inputText);
  assertEqual(result.temp_lora.length, 1);
});

test('场景2 - postMessageToWindowsPrompt: 空 Lora 数组（关键测试）', () => {
  const inputText = "test prompt";
  const selectedLoras = [];
  const tokens = [{ text: "test" }];
  const result = JSON.parse(postMessageToWindowsPrompt(inputText, selectedLoras, tokens));
  assertEqual(result.prompt, inputText);
  assertEqual(result.temp_lora, []);  // 关键：应该是空数组，不是空字符串
});

test('场景2 - handlePromptUpdateMessage: 正常数据', () => {
  const data = JSON.stringify({
    prompt: "test",
    lora: [{ name: 'lora1', weight: 1 }],
    temp_prompt: { key: 'value' },
    temp_lora: [{ name: 'lora1', weight: 1 }]
  });
  const result = handlePromptUpdateMessage(data);
  assertTrue(result.lora.length > 0);
  assertTrue(result.temp_lora.length > 0);
});

test('场景2 - handlePromptUpdateMessage: 空数组（关键测试）', () => {
  const data = JSON.stringify({
    prompt: "test",
    lora: '',
    temp_prompt: {},
    temp_lora: []
  });
  const result = handlePromptUpdateMessage(data);
  assertEqual(result.lora, "");
  assertEqual(result.temp_lora, "[]");  // 关键：空数组应该被正确保存
});

test('场景2 - 端到端: 删除所有 Lora 后同步', () => {
  const inputText = "test prompt";
  const selectedLoras = [];
  const tokens = [{ text: "test" }];
  
  // 模拟删除所有 Lora 后发送消息
  const sentData = postMessageToWindowsPrompt(inputText, selectedLoras, tokens);
  const receivedResult = handlePromptUpdateMessage(sentData);
  
  // 验证节点端正确保存空状态
  assertEqual(receivedResult.lora, "");
  assertEqual(receivedResult.temp_lora, "[]");
});

// --------------------------------------------
// 场景3: 内嵌 Lora 堆组件测试
// --------------------------------------------
console.log('\n--- 场景3: 内嵌 Lora 堆组件 (lora_stack.vue in prompt_box) ---\n');

test('场景3 - removeLoraFromEmbeddedStack: 删除单个 Lora', () => {
  const selectedLoras = [
    { name: 'lora1', weight: 1 },
    { name: 'lora2', weight: 1 }
  ];
  const result = removeLoraFromEmbeddedStack(selectedLoras, { name: 'lora1' });
  assertEqual(result.length, 1);
  assertEqual(result[0].name, 'lora2');
});

test('场景3 - removeLoraFromEmbeddedStack: 删除所有 Lora（关键测试）', () => {
  const selectedLoras = [{ name: 'lora1', weight: 1 }];
  const result = removeLoraFromEmbeddedStack(selectedLoras, { name: 'lora1' });
  assertEqual(result.length, 0);
  assertEqual(result, []);
});

test('场景3 - updateLoraTags: 正常数据', () => {
  const selectedLoras = [
    { name: 'lora1', weight: 1, text_encoder_weight: 1, trigger_weight: 1, hidden: false, lora: 'lora1.safetensors' }
  ];
  const result = updateLoraTags(selectedLoras);
  assertEqual(result.length, 1);
  assertTrue(result[0].includes('wlr:lora1:1:1:1'));
});

test('场景3 - updateLoraTags: 空数组（关键测试）', () => {
  const result = updateLoraTags([]);
  assertEqual(result.length, 0);
  assertEqual(result, []);
});

test('场景3 - updateLoraTags: 全部隐藏', () => {
  const selectedLoras = [
    { name: 'lora1', weight: 1, hidden: true, lora: 'lora1.safetensors' }
  ];
  const result = updateLoraTags(selectedLoras);
  assertEqual(result.length, 0);  // 全部隐藏时应该返回空数组
});

// --------------------------------------------
// 端到端测试：完整数据流
// --------------------------------------------
console.log('\n--- 端到端测试：完整数据流 ---\n');

test('端到端: 场景1 - 独立 Lora 堆窗口数据同步', () => {
  // 1. Vue 端发送数据
  const selectedLoras = [{ name: 'lora1', weight: 1, hidden: false }];
  const sentData = updateLoraStackInfoToWindows(selectedLoras);
  
  // 2. 节点端接收并处理
  const receivedResult = handleLoraStackMessage(sentData);
  
  // 3. 验证数据正确传递
  const receivedTempLora = JSON.parse(receivedResult.temp_lora);
  assertEqual(receivedTempLora.length, 1);
  assertEqual(receivedTempLora[0].name, 'lora1');
});

test('端到端: 场景2 - 提示词编辑器数据同步', () => {
  // 1. Vue 端发送数据
  const inputText = "test prompt";
  const selectedLoras = [{ name: 'lora1', weight: 1, hidden: false }];
  const tokens = [{ text: "test" }];
  const sentData = postMessageToWindowsPrompt(inputText, selectedLoras, tokens);
  
  // 2. 节点端接收并处理
  const receivedResult = handlePromptUpdateMessage(sentData);
  
  // 3. 验证数据正确传递
  assertEqual(receivedResult.prompt, inputText);
  const receivedTempLora = JSON.parse(receivedResult.temp_lora);
  assertEqual(receivedTempLora.length, 1);
});

test('端到端: 场景2 - 删除所有 Lora 后数据同步（关键测试）', () => {
  // 1. 模拟删除所有 Lora
  const inputText = "test prompt";
  const selectedLoras = [];
  const tokens = [{ text: "test" }];
  
  // 2. Vue 端发送空数据
  const sentData = postMessageToWindowsPrompt(inputText, selectedLoras, tokens);
  
  // 3. 节点端接收并处理
  const receivedResult = handlePromptUpdateMessage(sentData);
  
  // 4. 验证空数据正确保存
  assertEqual(receivedResult.lora, "");
  assertEqual(receivedResult.temp_lora, "[]");  // 关键：空数组应该被正确保存
});

test('端到端: 场景3 - 内嵌 Lora 堆删除后数据同步', () => {
  // 1. 初始有 Lora
  let selectedLoras = [
    { name: 'lora1', weight: 1, text_encoder_weight: 1, trigger_weight: 1, hidden: false, lora: 'lora1.safetensors' }
  ];
  
  // 2. 删除 Lora
  selectedLoras = removeLoraFromEmbeddedStack(selectedLoras, { name: 'lora1' });
  
  // 3. 发送更新消息
  const loraTags = updateLoraTags(selectedLoras);
  
  // 4. 验证空数据
  assertEqual(selectedLoras.length, 0);
  assertEqual(loraTags.length, 0);
  
  // 5. 通过 postMessageToWindowsPrompt 发送到节点
  const inputText = "test prompt";
  const tokens = [{ text: "test" }];
  const sentData = postMessageToWindowsPrompt(inputText, selectedLoras, tokens);
  const receivedResult = handlePromptUpdateMessage(sentData);
  
  // 6. 验证节点端正确保存空状态
  assertEqual(receivedResult.temp_lora, "[]");
});

// --------------------------------------------
// 边界情况测试
// --------------------------------------------
console.log('\n--- 边界情况测试 ---\n');

test('边界: 大量数据', () => {
  const selectedLoras = Array.from({ length: 100 }, (_, i) => ({
    name: `lora${i}`,
    weight: 1,
    hidden: false
  }));
  const sentData = updateLoraStackInfoToWindows(selectedLoras);
  const receivedResult = handleLoraStackMessage(sentData);
  
  const receivedTempLora = JSON.parse(receivedResult.temp_lora);
  assertEqual(receivedTempLora.length, 100);
});

test('边界: 特殊字符', () => {
  const selectedLoras = [{ name: 'lora"with"quotes', weight: 1, hidden: false }];
  const sentData = updateLoraStackInfoToWindows(selectedLoras);
  const receivedResult = handleLoraStackMessage(sentData);
  
  const receivedTempLora = JSON.parse(receivedResult.temp_lora);
  assertEqual(receivedTempLora[0].name, 'lora"with"quotes');
});

test('边界: Unicode 字符', () => {
  const selectedLoras = [{ name: '模型测试模型', weight: 1, hidden: false }];
  const sentData = updateLoraStackInfoToWindows(selectedLoras);
  const receivedResult = handleLoraStackMessage(sentData);
  
  const receivedTempLora = JSON.parse(receivedResult.temp_lora);
  assertEqual(receivedTempLora[0].name, '模型测试模型');
});

test('边界: 嵌套空值', () => {
  const data = JSON.stringify({
    lora: null,
    temp_lora: null,
    temp_prompt: null
  });
  const result = handlePromptUpdateMessage(data);
  assertEqual(result.lora, "");
  assertEqual(result.temp_lora, "");
  assertEqual(result.temp_prompt, "");
});

// --------------------------------------------
// 回归测试：确保修复后的代码不会再次出现问题
// --------------------------------------------
console.log('\n--- 回归测试：确保修复有效 ---\n');

test('回归: 场景1 - 空字符串 vs 空数组', () => {
  // 修复前：temp_lora: ''
  const oldData = JSON.stringify({ lora: '', temp_lora: '' });
  const oldResult = handleLoraStackMessage(oldData);
  
  // 修复后：temp_lora: []
  const newData = JSON.stringify({ lora: '', temp_lora: [] });
  const newResult = handleLoraStackMessage(newData);
  
  // 修复前：空字符串不会被保存
  assertEqual(oldResult.temp_lora, "");
  
  // 修复后：空数组会被正确保存
  assertEqual(newResult.temp_lora, "[]");
});

test('回归: 场景2 - 空字符串 vs 空数组', () => {
  const inputText = "test";
  const tokens = [];
  
  // 修复前：temp_lora: ''
  const oldData = JSON.stringify({
    prompt: inputText,
    lora: '',
    temp_prompt: tokens,
    temp_lora: ''
  });
  const oldResult = handlePromptUpdateMessage(oldData);
  
  // 修复后：temp_lora: []
  const newData = postMessageToWindowsPrompt(inputText, [], tokens);
  const newResult = handlePromptUpdateMessage(newData);
  
  // 修复前：空字符串不会被保存
  assertEqual(oldResult.temp_lora, "");
  
  // 修复后：空数组会被正确保存
  assertEqual(newResult.temp_lora, "[]");
});

// ============================================
// 测试结果汇总
// ============================================

console.log('\n============================================');
console.log('测试结果汇总');
console.log('============================================');
console.log(`✅ 通过: ${passCount}`);
console.log(`❌ 失败: ${failCount}`);
console.log(`📊 总计: ${passCount + failCount}`);
console.log('============================================\n');

// 输出失败测试的详细信息
if (failCount > 0) {
  console.log('失败的测试:');
  testResults.filter(t => t.status === 'FAIL').forEach(t => {
    console.log(`  - ${t.name}`);
    console.log(`    ${t.error}`);
  });
  console.log('');
  process.exit(1);
}
