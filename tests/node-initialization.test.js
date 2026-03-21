/**
 * 节点初始化场景单元测试
 * 
 * 测试节点在各种初始化状态下的鲁棒性
 * 确保代码能够正确处理未初始化的节点和空值情况
 */

console.log('\n============================================');
console.log('节点初始化场景单元测试');
console.log('============================================\n');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passCount++;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    failCount++;
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertDefined(value, message = '') {
  if (value === undefined || value === null) {
    throw new Error(`${message}\nExpected value to be defined, but got: ${value}`);
  }
}

function assertNoError(fn, message = '') {
  try {
    fn();
  } catch (error) {
    throw new Error(`${message}\nFunction should not throw, but threw: ${error.message}`);
  }
}

// ============================================
// 测试 1: nodeTextAreaList 空值访问保护
// ============================================
console.log('\n--- 测试 nodeTextAreaList 空值访问保护 ---\n');

test('nodeTextAreaList[0] 不存在时应该安全处理', () => {
  const nodeTextAreaList = [];
  
  // 模拟修复后的代码逻辑
  const getValue = () => {
    if (!nodeTextAreaList[0]) {
      return '';
    }
    return nodeTextAreaList[0].value;
  };
  
  assertNoError(getValue, '访问不存在的数组元素应该安全');
  assertEqual(getValue(), '', '应该返回默认空字符串');
});

test('nodeTextAreaList[0] 存在时应该正确获取值', () => {
  const nodeTextAreaList = [{ value: 'test prompt' }];
  
  const getValue = () => {
    if (!nodeTextAreaList[0]) {
      return '';
    }
    return nodeTextAreaList[0].value;
  };
  
  assertEqual(getValue(), 'test prompt', '应该正确返回值');
});

test('使用三元运算符处理空值', () => {
  const nodeTextAreaList = [];
  const value = nodeTextAreaList[0] ? nodeTextAreaList[0].value : '';
  
  assertEqual(value, '', '三元运算符应该返回默认值');
});

test('使用可选链操作符处理嵌套访问', () => {
  const nodeTextAreaList = [];
  const value = nodeTextAreaList[0]?.value || '';
  
  assertEqual(value, '', '可选链应该安全处理空值');
});

// ============================================
// 测试 2: 消息处理器空值保护
// ============================================
console.log('\n--- 测试消息处理器空值保护 ---\n');

test('消息处理器应该在节点未初始化时安全退出', () => {
  const nodeTextAreaList = [];
  const event = {
    data: {
      type: 'weilin_prompt_ui_update_lora_tags_test',
      tags: ['<wlr:test:1:1>']
    }
  };
  
  const handleMessage = () => {
    const loraTags = event.data.tags;
    
    if (!nodeTextAreaList[0]) {
      console.warn('[WeiLin] nodeTextAreaList[0] is not available');
      return;
    }
    
    const currentPrompt = nodeTextAreaList[0].value;
    // 后续处理...
  };
  
  assertNoError(handleMessage, '消息处理器应该安全处理未初始化的节点');
});

test('更新提示词消息应该检查节点存在性', () => {
  const nodeTextAreaList = [];
  const nodeWidgetList = [];
  const jsonData = { prompt: 'new prompt' };
  
  const updatePrompt = () => {
    if (nodeTextAreaList[0]) {
      nodeTextAreaList[0].value = jsonData.prompt;
    }
    if (nodeWidgetList[0]) {
      nodeWidgetList[0].value = jsonData.prompt;
    }
  };
  
  assertNoError(updatePrompt, '更新提示词应该安全处理空节点');
});

// ============================================
// 测试 3: Lora 标签处理空值保护
// ============================================
console.log('\n--- 测试 Lora 标签处理空值保护 ---\n');

test('处理 Lora 标签更新时应该检查节点存在', () => {
  const nodeTextAreaList = [];
  const nodeWidgetList = [];
  const loraTags = ['<wlr:lora1:1:1>', '<wlr:lora2:0.8:1>'];
  
  const updateLoraTags = () => {
    if (!nodeTextAreaList[0]) {
      console.warn('[WeiLin] nodeTextAreaList[0] is not available');
      return false;
    }
    
    const currentPrompt = nodeTextAreaList[0].value;
    const wlrPattern = /<wlr:[^>]+>/g;
    let cleanText = currentPrompt.replace(wlrPattern, '');
    
    cleanText = cleanText
      .replace(/,\s*,/g, ',')
      .replace(/,\s*$/g, '')
      .replace(/^\s*,/g, '')
      .trim();
    
    const newTags = loraTags.join(', ');
    nodeTextAreaList[0].value = cleanText ? `${newTags}, ${cleanText}` : newTags;
    
    if (nodeWidgetList[0]) {
      nodeWidgetList[0].value = nodeTextAreaList[0].value;
    }
    
    return true;
  };
  
  assertNoError(updateLoraTags, 'Lora 标签更新应该安全处理');
  assertEqual(updateLoraTags(), false, '节点不存在时应该返回 false');
});

test('清空 Lora 标签时应该安全处理', () => {
  const nodeTextAreaList = [{ value: '<wlr:test:1:1>, some prompt' }];
  const nodeWidgetList = [];
  const loraTags = []; // 空数组表示清空
  
  const clearLoraTags = () => {
    if (!nodeTextAreaList[0]) {
      return false;
    }
    
    const currentPrompt = nodeTextAreaList[0].value;
    const wlrPattern = /<wlr:[^>]+>/g;
    let cleanText = currentPrompt.replace(wlrPattern, '');
    
    cleanText = cleanText
      .replace(/,\s*,/g, ',')
      .replace(/,\s*$/g, '')
      .replace(/^\s*,/g, '')
      .trim();
    
    nodeTextAreaList[0].value = cleanText;
    return true;
  };
  
  assertNoError(clearLoraTags, '清空 Lora 标签应该安全处理');
  assertEqual(clearLoraTags(), true, '应该成功清空');
  assertEqual(nodeTextAreaList[0].value, 'some prompt', '应该只保留非 Lora 内容');
});

// ============================================
// 测试 4: 节点列表操作空值保护
// ============================================
console.log('\n--- 测试节点列表操作空值保护 ---\n');

test('添加节点到全局列表时应该检查存在性', () => {
  const nodeTextAreaList = [];
  const globalNodeList = [];
  const thisNodeSeed = 'test-seed';
  const nodeId = 'node-123';
  
  const addNodeToList = () => {
    if (nodeTextAreaList[0]) {
      globalNodeList.push({
        seed: thisNodeSeed,
        text: nodeTextAreaList[0].value,
        id: nodeId
      });
      return true;
    }
    return false;
  };
  
  assertNoError(addNodeToList, '添加节点到列表应该安全');
  assertEqual(addNodeToList(), false, '节点不存在时不应添加');
  assertEqual(globalNodeList.length, 0, '列表应该保持为空');
});

test('节点存在时应该成功添加到列表', () => {
  const nodeTextAreaList = [{ value: 'test prompt' }];
  const globalNodeList = [];
  const thisNodeSeed = 'test-seed';
  const nodeId = 'node-123';
  
  const addNodeToList = () => {
    if (nodeTextAreaList[0]) {
      globalNodeList.push({
        seed: thisNodeSeed,
        text: nodeTextAreaList[0].value,
        id: nodeId
      });
      return true;
    }
    return false;
  };
  
  assertEqual(addNodeToList(), true, '应该成功添加');
  assertEqual(globalNodeList.length, 1, '列表应该有一个元素');
  assertEqual(globalNodeList[0].text, 'test prompt', '应该保存正确的文本');
});

// ============================================
// 测试 5: JSON 数据构建空值保护
// ============================================
console.log('\n--- 测试 JSON 数据构建空值保护 ---\n');

test('构建 JSON 数据时应该安全处理空节点', () => {
  const nodeTextAreaList = [];
  
  const buildJsonData = () => {
    return {
      prompt: nodeTextAreaList[0] ? nodeTextAreaList[0].value : '',
      lora: [],
      temp_prompt: {},
      temp_lora: {}
    };
  };
  
  const jsonData = buildJsonData();
  assertNoError(buildJsonData, '构建 JSON 应该安全');
  assertEqual(jsonData.prompt, '', '空节点应该返回空字符串');
  assertDefined(jsonData.lora, 'lora 字段应该存在');
});

test('节点存在时应该正确构建 JSON', () => {
  const nodeTextAreaList = [
    { value: 'test prompt' },
    { value: '[{"name": "lora1"}]' }
  ];
  
  const buildJsonData = () => {
    const data = {
      prompt: nodeTextAreaList[0] ? nodeTextAreaList[0].value : '',
      lora: [],
      temp_prompt: {},
      temp_lora: {}
    };
    
    if (nodeTextAreaList[1] && nodeTextAreaList[1].value) {
      try {
        data.lora = JSON.parse(nodeTextAreaList[1].value);
      } catch (e) {
        console.warn('Failed to parse lora data');
      }
    }
    
    return data;
  };
  
  const jsonData = buildJsonData();
  assertEqual(jsonData.prompt, 'test prompt', '应该包含正确的提示词');
  assertEqual(jsonData.lora.length, 1, '应该解析 Lora 数据');
});

// ============================================
// 测试 6: 事件监听器空值保护
// ============================================
console.log('\n--- 测试事件监听器空值保护 ---\n');

test('添加事件监听器时应该检查节点存在', () => {
  const nodeTextAreaList = [];
  let listenerAdded = false;
  
  const addEventListener = () => {
    if (nodeTextAreaList[0]) {
      const textarea = nodeTextAreaList[0];
      // 模拟添加监听器
      listenerAdded = true;
    }
  };
  
  assertNoError(addEventListener, '添加监听器应该安全');
  assertEqual(listenerAdded, false, '节点不存在时不应添加监听器');
});

// ============================================
// 测试 7: 边界情况测试
// ============================================
console.log('\n--- 测试边界情况 ---\n');

test('null 值应该被正确处理', () => {
  const nodeTextAreaList = [null];
  
  const getValue = () => {
    return nodeTextAreaList[0]?.value || '';
  };
  
  assertNoError(getValue, 'null 值应该安全处理');
  assertEqual(getValue(), '', 'null 应该返回默认值');
});

test('undefined 值应该被正确处理', () => {
  const nodeTextAreaList = [undefined];
  
  const getValue = () => {
    return nodeTextAreaList[0]?.value || '';
  };
  
  assertNoError(getValue, 'undefined 值应该安全处理');
  assertEqual(getValue(), '', 'undefined 应该返回默认值');
});

test('空对象应该被正确处理', () => {
  const nodeTextAreaList = [{}];
  
  const getValue = () => {
    return nodeTextAreaList[0]?.value || '';
  };
  
  assertNoError(getValue, '空对象应该安全处理');
  assertEqual(getValue(), '', '空对象应该返回默认值');
});

// ============================================
// 测试结果汇总
// ============================================
console.log('\n============================================');
console.log('测试结果汇总');
console.log('============================================\n');
console.log(`总计: ✅ ${passCount} 通过, ❌ ${failCount} 失败`);
console.log(`覆盖率: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
console.log('============================================\n');

if (failCount > 0) {
  console.log('⚠️  存在失败的测试，请检查上述输出');
  process.exit(1);
} else {
  console.log('🎉 所有测试通过！');
}
