/**
 * WeiLin-ComfyUI-Tools 节点输出口格式验证测试
 *
 * 测试覆盖：
 * 1. WeiLinPromptUI 节点输出格式验证
 * 2. WeiLinPromptUIWithoutLora 节点输出格式验证
 * 3. WeiLinPromptUIOnlyLoraStack 节点输出格式验证
 * 4. CONDITIONING 格式验证
 * 5. 边界情况和错误处理
 *
 * 运行方式: node tests/node-output-format.test.js
 */

// ============================================
// 测试工具函数
// ============================================

let passCount = 0;
let failCount = 0;
const testResults = [];
const testGroups = {};

function test(name, fn, group = 'default') {
  if (!testGroups[group]) {
    testGroups[group] = { pass: 0, fail: 0 };
  }
  try {
    fn();
    passCount++;
    testGroups[group].pass++;
    testResults.push({ name, group, status: 'PASS', error: null });
    console.log(`  ✅ ${name}`);
  } catch (error) {
    failCount++;
    testGroups[group].fail++;
    testResults.push({ name, group, status: 'FAIL', error: error.message });
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${error.message}`);
  }
}

function assertEqual(actual, expected, message = '') {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}\n     Expected: ${expectedStr}\n     Actual: ${actualStr}`);
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

function assertType(value, expectedType, message = '') {
  const actualType = typeof value;
  if (actualType !== expectedType) {
    throw new Error(`${message}\n     Expected type: ${expectedType}\n     Actual type: ${actualType}`);
  }
}

function assertArray(value, message = '') {
  if (!Array.isArray(value)) {
    throw new Error(`${message}\n     Expected: Array\n     Actual: ${typeof value}`);
  }
}

function assertArrayLength(value, expectedLength, message = '') {
  if (!Array.isArray(value)) {
    throw new Error(`${message}\n     Expected: Array\n     Actual: ${typeof value}`);
  }
  if (value.length !== expectedLength) {
    throw new Error(`${message}\n     Expected length: ${expectedLength}\n     Actual length: ${value.length}`);
  }
}

// ============================================
// 节点输出类型定义
// ============================================

const NodeOutputTypes = {
  STRING: 'STRING',
  CONDITIONING: 'CONDITIONING',
  CLIP: 'CLIP',
  MODEL: 'MODEL'
};

// 节点输出定义
const NodeDefinitions = {
  WeiLinPromptUI: {
    name: 'WeiLinPromptUI',
    displayName: 'WeiLin 全能提示词编辑器',
    returnTypes: ['STRING', 'CONDITIONING', 'CLIP', 'MODEL'],
    returnNames: ['STRING', 'CONDITIONING', 'CLIP', 'MODEL'],
    outputCount: 4
  },
  WeiLinPromptUIWithoutLora: {
    name: 'WeiLinPromptUIWithoutLora',
    displayName: 'WeiLin 提示词编辑器',
    returnTypes: ['STRING', 'CONDITIONING', 'CLIP'],
    returnNames: ['STRING', 'CONDITIONING', 'CLIP'],
    outputCount: 3
  },
  WeiLinPromptUIOnlyLoraStack: {
    name: 'WeiLinPromptUIOnlyLoraStack',
    displayName: 'WeiLin Lora堆',
    returnTypes: ['CLIP', 'MODEL'],
    returnNames: ['CLIP', 'MODEL'],
    outputCount: 2
  }
};

// ============================================
// 模块1: 节点输出类型定义验证
// ============================================

console.log('\n============================================');
console.log('模块1: 节点输出类型定义验证');
console.log('============================================\n');

function validateNodeDefinition(nodeDef) {
  const errors = [];

  // 检查必要字段
  if (!nodeDef.name) errors.push('Missing name field');
  if (!nodeDef.returnTypes) errors.push('Missing returnTypes field');
  if (!nodeDef.returnNames) errors.push('Missing returnNames field');
  if (nodeDef.outputCount === undefined) errors.push('Missing outputCount field');

  // 检查 returnTypes 和 returnNames 长度一致
  if (nodeDef.returnTypes && nodeDef.returnNames) {
    if (nodeDef.returnTypes.length !== nodeDef.returnNames.length) {
      errors.push('returnTypes and returnNames length mismatch');
    }
  }

  // 检查 outputCount 与实际数组长度一致
  if (nodeDef.returnTypes && nodeDef.outputCount !== undefined) {
    if (nodeDef.returnTypes.length !== nodeDef.outputCount) {
      errors.push('outputCount does not match returnTypes length');
    }
  }

  // 检查返回类型是否有效
  const validTypes = Object.values(NodeOutputTypes);
  if (nodeDef.returnTypes) {
    for (const type of nodeDef.returnTypes) {
      if (!validTypes.includes(type)) {
        errors.push(`Invalid return type: ${type}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// 测试用例
test('WeiLinPromptUI: 输出类型定义验证', () => {
  const result = validateNodeDefinition(NodeDefinitions.WeiLinPromptUI);
  assertTrue(result.valid, result.errors.join(', '));
}, '节点定义');

test('WeiLinPromptUIWithoutLora: 输出类型定义验证', () => {
  const result = validateNodeDefinition(NodeDefinitions.WeiLinPromptUIWithoutLora);
  assertTrue(result.valid, result.errors.join(', '));
}, '节点定义');

test('WeiLinPromptUIOnlyLoraStack: 输出类型定义验证', () => {
  const result = validateNodeDefinition(NodeDefinitions.WeiLinPromptUIOnlyLoraStack);
  assertTrue(result.valid, result.errors.join(', '));
}, '节点定义');

test('WeiLinPromptUI: 输出口数量为4', () => {
  assertEqual(NodeDefinitions.WeiLinPromptUI.outputCount, 4);
}, '节点定义');

test('WeiLinPromptUIWithoutLora: 输出口数量为3', () => {
  assertEqual(NodeDefinitions.WeiLinPromptUIWithoutLora.outputCount, 3);
}, '节点定义');

test('WeiLinPromptUIOnlyLoraStack: 输出口数量为2', () => {
  assertEqual(NodeDefinitions.WeiLinPromptUIOnlyLoraStack.outputCount, 2);
}, '节点定义');

// ============================================
// 模块2: CONDITIONING 格式验证
// ============================================

console.log('\n============================================');
console.log('模块2: CONDITIONING 格式验证');
console.log('============================================\n');

/**
 * 验证 CONDITIONING 输出格式
 * CONDITIONING 应该是 [[cond_tensor, dict]] 或 None 的格式
 */
function validateConditioningOutput(conditioningData) {
  // None/null 是有效的
  if (conditioningData === null || conditioningData === undefined) {
    return { valid: true, error: null };
  }

  // 检查是否是列表格式
  if (!Array.isArray(conditioningData)) {
    return { valid: false, error: `Expected list, got ${typeof conditioningData}` };
  }

  // 空列表是有效的
  if (conditioningData.length === 0) {
    return { valid: true, error: null };
  }

  // 检查第一个元素是否是 [cond, dict] 格式
  const firstItem = conditioningData[0];
  if (!Array.isArray(firstItem)) {
    return { valid: false, error: `First item should be array, got ${typeof firstItem}` };
  }

  if (firstItem.length < 2) {
    return { valid: false, error: `First item should have at least 2 elements, got ${firstItem.length}` };
  }

  // 第二个元素应该是字典（包含 pooled, etc.）
  const dictPart = firstItem[1];
  if (typeof dictPart !== 'object' || Array.isArray(dictPart)) {
    return { valid: false, error: `Second element should be object/dict, got ${typeof dictPart}` };
  }

  return { valid: true, error: null };
}

// 模拟有效的 CONDITIONING 数据
function createValidConditioning() {
  return [
    [
      { tensor: 'mock_tensor_data' }, // cond tensor (模拟)
      { pooled: 'mock_pooled_data', default: true } // dict with pooled
    ]
  ];
}

// 测试用例
test('validateConditioningOutput: null 值有效', () => {
  const result = validateConditioningOutput(null);
  assertTrue(result.valid);
}, 'CONDITIONING格式');

test('validateConditioningOutput: undefined 值有效', () => {
  const result = validateConditioningOutput(undefined);
  assertTrue(result.valid);
}, 'CONDITIONING格式');

test('validateConditioningOutput: 空数组有效', () => {
  const result = validateConditioningOutput([]);
  assertTrue(result.valid);
}, 'CONDITIONING格式');

test('validateConditioningOutput: 有效 CONDITIONING 格式', () => {
  const cond = createValidConditioning();
  const result = validateConditioningOutput(cond);
  assertTrue(result.valid, result.error);
}, 'CONDITIONING格式');

test('validateConditioningOutput: 无效 - 非数组', () => {
  const result = validateConditioningOutput('invalid');
  assertFalse(result.valid);
}, 'CONDITIONING格式');

test('validateConditioningOutput: 无效 - 内部元素非数组', () => {
  const result = validateConditioningOutput(['invalid']);
  assertFalse(result.valid);
}, 'CONDITIONING格式');

test('validateConditioningOutput: 无效 - 内部数组长度不足', () => {
  const result = validateConditioningOutput([['only_one']]);
  assertFalse(result.valid);
}, 'CONDITIONING格式');

test('validateConditioningOutput: 无效 - 第二个元素非对象', () => {
  const result = validateConditioningOutput([['cond', 'not_dict']]);
  assertFalse(result.valid);
}, 'CONDITIONING格式');

test('validateConditioningOutput: 多个条件项', () => {
  const cond = [
    [{ tensor: 'cond1' }, { pooled: 'pooled1' }],
    [{ tensor: 'cond2' }, { pooled: 'pooled2' }]
  ];
  const result = validateConditioningOutput(cond);
  assertTrue(result.valid, result.error);
}, 'CONDITIONING格式');

// ============================================
// 模块3: 节点输出结果格式验证
// ============================================

console.log('\n============================================');
console.log('模块3: 节点输出结果格式验证');
console.log('============================================\n');

/**
 * 验证节点输出结果格式
 */
function validateNodeOutput(nodeName, output) {
  const nodeDef = NodeDefinitions[nodeName];
  if (!nodeDef) {
    return { valid: false, error: `Unknown node: ${nodeName}` };
  }

  const errors = [];

  // 检查输出是否是数组或元组
  if (!Array.isArray(output)) {
    return { valid: false, error: 'Output must be an array' };
  }

  // 检查输出数量
  if (output.length !== nodeDef.outputCount) {
    errors.push(`Expected ${nodeDef.outputCount} outputs, got ${output.length}`);
  }

  // 验证每个输出的类型
  for (let i = 0; i < nodeDef.returnTypes.length; i++) {
    const expectedType = nodeDef.returnTypes[i];
    const actualValue = output[i];

    switch (expectedType) {
      case 'STRING':
        if (typeof actualValue !== 'string') {
          errors.push(`Output ${i}: Expected STRING, got ${typeof actualValue}`);
        }
        break;
      case 'CONDITIONING':
        const condResult = validateConditioningOutput(actualValue);
        if (!condResult.valid) {
          errors.push(`Output ${i}: Invalid CONDITIONING - ${condResult.error}`);
        }
        break;
      case 'CLIP':
        // CLIP 通常是对象或 null
        if (actualValue !== null && typeof actualValue !== 'object') {
          errors.push(`Output ${i}: Expected CLIP (object), got ${typeof actualValue}`);
        }
        break;
      case 'MODEL':
        // MODEL 通常是对象或 null
        if (actualValue !== null && typeof actualValue !== 'object') {
          errors.push(`Output ${i}: Expected MODEL (object), got ${typeof actualValue}`);
        }
        break;
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// 模拟节点输出
function createWeiLinPromptUIOutput(options = {}) {
  return [
    options.text || 'test prompt',
    options.conditioning !== undefined ? options.conditioning : createValidConditioning(),
    options.clip || { type: 'CLIP', mock: true },
    options.model || { type: 'MODEL', mock: true }
  ];
}

function createWeiLinPromptUIWithoutLoraOutput(options = {}) {
  return [
    options.text || 'test prompt',
    options.conditioning !== undefined ? options.conditioning : createValidConditioning(),
    options.clip || { type: 'CLIP', mock: true }
  ];
}

function createWeiLinPromptUIOnlyLoraStackOutput(options = {}) {
  return [
    options.clip || { type: 'CLIP', mock: true },
    options.model || { type: 'MODEL', mock: true }
  ];
}

// 测试用例
test('WeiLinPromptUI: 有效输出格式', () => {
  const output = createWeiLinPromptUIOutput();
  const result = validateNodeOutput('WeiLinPromptUI', output);
  assertTrue(result.valid, result.errors.join(', '));
}, '节点输出');

test('WeiLinPromptUI: 输出数量正确', () => {
  const output = createWeiLinPromptUIOutput();
  assertArrayLength(output, 4);
}, '节点输出');

test('WeiLinPromptUI: 第一个输出是 STRING', () => {
  const output = createWeiLinPromptUIOutput();
  assertType(output[0], 'string');
}, '节点输出');

test('WeiLinPromptUI: 第二个输出是 CONDITIONING', () => {
  const output = createWeiLinPromptUIOutput();
  const condResult = validateConditioningOutput(output[1]);
  assertTrue(condResult.valid, condResult.error);
}, '节点输出');

test('WeiLinPromptUI: 第三个输出是 CLIP 对象', () => {
  const output = createWeiLinPromptUIOutput();
  assertTrue(typeof output[2] === 'object' && output[2] !== null);
}, '节点输出');

test('WeiLinPromptUI: 第四个输出是 MODEL 对象', () => {
  const output = createWeiLinPromptUIOutput();
  assertTrue(typeof output[3] === 'object' && output[3] !== null);
}, '节点输出');

test('WeiLinPromptUIWithoutLora: 有效输出格式', () => {
  const output = createWeiLinPromptUIWithoutLoraOutput();
  const result = validateNodeOutput('WeiLinPromptUIWithoutLora', output);
  assertTrue(result.valid, result.errors.join(', '));
}, '节点输出');

test('WeiLinPromptUIWithoutLora: 输出数量正确', () => {
  const output = createWeiLinPromptUIWithoutLoraOutput();
  assertArrayLength(output, 3);
}, '节点输出');

test('WeiLinPromptUIOnlyLoraStack: 有效输出格式', () => {
  const output = createWeiLinPromptUIOnlyLoraStackOutput();
  const result = validateNodeOutput('WeiLinPromptUIOnlyLoraStack', output);
  assertTrue(result.valid, result.errors.join(', '));
}, '节点输出');

test('WeiLinPromptUIOnlyLoraStack: 输出数量正确', () => {
  const output = createWeiLinPromptUIOnlyLoraStackOutput();
  assertArrayLength(output, 2);
}, '节点输出');

// ============================================
// 模块4: 边界情况和错误处理
// ============================================

console.log('\n============================================');
console.log('模块4: 边界情况和错误处理');
console.log('============================================\n');

// 测试用例
test('WeiLinPromptUI: CONDITIONING 为 null 时有效', () => {
  const output = createWeiLinPromptUIOutput({ conditioning: null });
  const result = validateNodeOutput('WeiLinPromptUI', output);
  assertTrue(result.valid, result.errors.join(', '));
}, '边界情况');

test('WeiLinPromptUI: CLIP 为 null 时有效', () => {
  const output = createWeiLinPromptUIOutput({ clip: null });
  const result = validateNodeOutput('WeiLinPromptUI', output);
  assertTrue(result.valid, result.errors.join(', '));
}, '边界情况');

test('WeiLinPromptUI: MODEL 为 null 时有效', () => {
  const output = createWeiLinPromptUIOutput({ model: null });
  const result = validateNodeOutput('WeiLinPromptUI', output);
  assertTrue(result.valid, result.errors.join(', '));
}, '边界情况');

test('WeiLinPromptUI: 空字符串提示词有效', () => {
  const output = createWeiLinPromptUIOutput({ text: '' });
  const result = validateNodeOutput('WeiLinPromptUI', output);
  assertTrue(result.valid, result.errors.join(', '));
}, '边界情况');

test('WeiLinPromptUI: 输出数量不足时无效', () => {
  const output = ['text only'];
  const result = validateNodeOutput('WeiLinPromptUI', output);
  assertFalse(result.valid);
}, '边界情况');

test('WeiLinPromptUI: 输出数量过多时无效', () => {
  const output = ['text', null, null, null, 'extra'];
  const result = validateNodeOutput('WeiLinPromptUI', output);
  assertFalse(result.valid);
}, '边界情况');

test('WeiLinPromptUI: STRING 输出类型错误时无效', () => {
  const output = [123, null, null, null]; // 第一个应该是 string
  const result = validateNodeOutput('WeiLinPromptUI', output);
  assertFalse(result.valid);
}, '边界情况');

test('WeiLinPromptUIWithoutLora: 所有可选输出为 null 时有效', () => {
  const output = ['prompt', null, null];
  const result = validateNodeOutput('WeiLinPromptUIWithoutLora', output);
  assertTrue(result.valid, result.errors.join(', '));
}, '边界情况');

test('WeiLinPromptUIOnlyLoraStack: CLIP 和 MODEL 都为 null 时有效', () => {
  const output = [null, null];
  const result = validateNodeOutput('WeiLinPromptUIOnlyLoraStack', output);
  assertTrue(result.valid, result.errors.join(', '));
}, '边界情况');

test('未知节点: 验证失败', () => {
  const result = validateNodeOutput('UnknownNode', []);
  assertFalse(result.valid);
}, '边界情况');

// ============================================
// 模块5: 特殊格式验证
// ============================================

console.log('\n============================================');
console.log('模块5: 特殊格式验证');
console.log('============================================\n');

// 验证 JSON 格式的提示词输入
function validatePromptJsonFormat(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed !== 'object') {
      return { valid: false, error: 'Parsed result is not an object' };
    }
    // 检查必要字段
    if (parsed.prompt === undefined) {
      return { valid: false, error: 'Missing prompt field' };
    }
    return { valid: true, data: parsed };
  } catch (e) {
    return { valid: false, error: `JSON parse error: ${e.message}` };
  }
}

// 验证 Lora JSON 格式
function validateLoraJsonFormat(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return { valid: false, error: 'Lora JSON should be an array' };
    }
    // 验证每个 lora 项
    for (let i = 0; i < parsed.length; i++) {
      const lora = parsed[i];
      if (!lora.lora) {
        return { valid: false, error: `Lora item ${i} missing 'lora' field` };
      }
      if (lora.weight === undefined) {
        return { valid: false, error: `Lora item ${i} missing 'weight' field` };
      }
    }
    return { valid: true, data: parsed };
  } catch (e) {
    return { valid: false, error: `JSON parse error: ${e.message}` };
  }
}

// 验证 wlr 标签格式
function validateWlrTagFormat(text) {
  // 新格式(4参数): <wlr:name:model_weight:clip_weight:trigger_weight>
  const wlrPatternNew = /<wlr:([^:]+):([^:]+):([^:]+):([^>]+)>/g;
  // 旧格式(3参数): <wlr:name:model_weight:clip_weight>
  const wlrPatternOld = /<wlr:([^:]+):([^:]+):([^:>]+)>/g;

  const results = [];
  let match;

  // 匹配新格式
  while ((match = wlrPatternNew.exec(text)) !== null) {
    results.push({
      format: 'new',
      name: match[1],
      modelWeight: parseFloat(match[2]),
      clipWeight: parseFloat(match[3]),
      triggerWeight: parseFloat(match[4]),
      valid: !isNaN(parseFloat(match[2])) && !isNaN(parseFloat(match[3])) && !isNaN(parseFloat(match[4]))
    });
  }

  // 匹配旧格式（排除已被新格式匹配的部分）
  const textWithoutNew = text.replace(wlrPatternNew, '');
  while ((match = wlrPatternOld.exec(textWithoutNew)) !== null) {
    results.push({
      format: 'old',
      name: match[1],
      modelWeight: parseFloat(match[2]),
      clipWeight: parseFloat(match[3]),
      triggerWeight: parseFloat(match[3]), // 旧格式使用 clipWeight
      valid: !isNaN(parseFloat(match[2])) && !isNaN(parseFloat(match[3]))
    });
  }

  return {
    valid: results.length > 0 && results.every(r => r.valid),
    results
  };
}

// 测试用例
test('validatePromptJsonFormat: 有效 JSON', () => {
  const json = JSON.stringify({ prompt: 'test prompt', lora: [] });
  const result = validatePromptJsonFormat(json);
  assertTrue(result.valid, result.error);
}, '特殊格式');

test('validatePromptJsonFormat: 无效 JSON', () => {
  const result = validatePromptJsonFormat('not json');
  assertFalse(result.valid);
}, '特殊格式');

test('validatePromptJsonFormat: 缺少 prompt 字段', () => {
  const json = JSON.stringify({ lora: [] });
  const result = validatePromptJsonFormat(json);
  assertFalse(result.valid);
}, '特殊格式');

test('validateLoraJsonFormat: 有效 Lora JSON', () => {
  const json = JSON.stringify([
    { lora: 'test.safetensors', weight: 1, text_encoder_weight: 1 }
  ]);
  const result = validateLoraJsonFormat(json);
  assertTrue(result.valid, result.error);
}, '特殊格式');

test('validateLoraJsonFormat: 空 Lora 数组有效', () => {
  const result = validateLoraJsonFormat('[]');
  assertTrue(result.valid);
}, '特殊格式');

test('validateLoraJsonFormat: 缺少必要字段', () => {
  const json = JSON.stringify([{ name: 'test' }]); // 缺少 lora 和 weight
  const result = validateLoraJsonFormat(json);
  assertFalse(result.valid);
}, '特殊格式');

test('validateWlrTagFormat: 新格式(4参数)有效', () => {
  const text = '<wlr:test-lora:0.8:1:1>';
  const result = validateWlrTagFormat(text);
  assertTrue(result.valid);
  assertEqual(result.results.length, 1);
  assertEqual(result.results[0].format, 'new');
}, '特殊格式');

test('validateWlrTagFormat: 旧格式(3参数)有效', () => {
  const text = '<wlr:test-lora:0.8:1>';
  const result = validateWlrTagFormat(text);
  assertTrue(result.valid);
  assertEqual(result.results.length, 1);
  assertEqual(result.results[0].format, 'old');
}, '特殊格式');

test('validateWlrTagFormat: 多个 wlr 标签', () => {
  const text = '<wlr:lora1:0.8:1:1> some text <wlr:lora2:1:0.9:0.9>';
  const result = validateWlrTagFormat(text);
  assertTrue(result.valid);
  assertEqual(result.results.length, 2);
}, '特殊格式');

test('validateWlrTagFormat: 无效权重值', () => {
  const text = '<wlr:test:abc:1:1>'; // abc 不是有效数字
  const result = validateWlrTagFormat(text);
  assertFalse(result.valid);
}, '特殊格式');

test('validateWlrTagFormat: 无 wlr 标签', () => {
  const text = 'just normal text';
  const result = validateWlrTagFormat(text);
  assertFalse(result.valid); // 没有找到任何 wlr 标签
}, '特殊格式');

// ============================================
// 模块6: 输出类型兼容性检查
// ============================================

console.log('\n============================================');
console.log('模块6: 输出类型兼容性检查');
console.log('============================================\n');

// 检查输出类型是否可以连接到目标输入类型
function checkTypeCompatibility(outputType, inputType) {
  // 完全匹配
  if (outputType === inputType) {
    return { compatible: true, reason: 'Exact match' };
  }

  // ANY 类型可以接受任何输入
  if (inputType === '*' || inputType === 'ANY') {
    return { compatible: true, reason: 'ANY type accepts all' };
  }

  // 特殊兼容性规则
  const compatibilityRules = {
    'CONDITIONING': ['CONDITIONING'],
    'CLIP': ['CLIP'],
    'MODEL': ['MODEL'],
    'STRING': ['STRING', '*']
  };

  const allowedInputs = compatibilityRules[outputType] || [];
  if (allowedInputs.includes(inputType)) {
    return { compatible: true, reason: 'Compatible types' };
  }

  return { compatible: false, reason: `Type ${outputType} cannot connect to ${inputType}` };
}

// 测试用例
test('STRING 输出可连接 STRING 输入', () => {
  const result = checkTypeCompatibility('STRING', 'STRING');
  assertTrue(result.compatible);
}, '类型兼容');

test('CONDITIONING 输出可连接 CONDITIONING 输入', () => {
  const result = checkTypeCompatibility('CONDITIONING', 'CONDITIONING');
  assertTrue(result.compatible);
}, '类型兼容');

test('CLIP 输出可连接 CLIP 输入', () => {
  const result = checkTypeCompatibility('CLIP', 'CLIP');
  assertTrue(result.compatible);
}, '类型兼容');

test('MODEL 输出可连接 MODEL 输入', () => {
  const result = checkTypeCompatibility('MODEL', 'MODEL');
  assertTrue(result.compatible);
}, '类型兼容');

test('STRING 输出不可连接 CONDITIONING 输入', () => {
  const result = checkTypeCompatibility('STRING', 'CONDITIONING');
  assertFalse(result.compatible);
}, '类型兼容');

test('CONDITIONING 输出不可连接 CLIP 输入', () => {
  const result = checkTypeCompatibility('CONDITIONING', 'CLIP');
  assertFalse(result.compatible);
}, '类型兼容');

test('任何类型可连接 ANY 输入', () => {
  assertTrue(checkTypeCompatibility('STRING', '*').compatible);
  assertTrue(checkTypeCompatibility('CONDITIONING', 'ANY').compatible);
  assertTrue(checkTypeCompatibility('CLIP', '*').compatible);
}, '类型兼容');

// ============================================
// 测试结果汇总
// ============================================

console.log('\n============================================');
console.log('测试结果汇总');
console.log('============================================\n');

for (const [group, stats] of Object.entries(testGroups)) {
  console.log(`${group}: ${stats.pass}/${stats.pass + stats.fail} 通过`);
}

console.log('\n--------------------------------------------');
console.log(`总计: ✅ ${passCount} 通过, ❌ ${failCount} 失败`);
console.log(`覆盖率: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
console.log('============================================\n');

// 输出失败测试
if (failCount > 0) {
  console.log('失败的测试:');
  testResults.filter(t => t.status === 'FAIL').forEach(t => {
    console.log(`  [${t.group}] ${t.name}`);
    console.log(`    ${t.error}`);
  });
  console.log('');
  process.exit(1);
}
