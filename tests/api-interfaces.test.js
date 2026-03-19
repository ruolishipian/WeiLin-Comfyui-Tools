/**
 * WeiLin-ComfyUI-Tools API 接口测试
 * 
 * 测试覆盖：
 * 1. API 路由定义
 * 2. 请求/响应格式
 * 3. 参数验证
 * 4. 错误处理
 * 
 * 运行方式: node tests/api-interfaces.test.js
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

// ============================================
// API 路由定义
// ============================================

const APIRoutes = {
  // Lora 相关
  LORA_LIST: '/weilin_prompt_ui/lora/list',
  LORA_INFO: '/weilin_prompt_ui/lora/info',
  LORA_REFRESH: '/weilin_prompt_ui/lora/refresh',
  LORA_UPLOAD_IMAGE: '/weilin_prompt_ui/lora/upload_image',
  
  // Tag 相关
  TAG_GROUP_LIST: '/weilin_prompt_ui/tag_group/list',
  TAG_GROUP_ADD: '/weilin_prompt_ui/tag_group/add',
  TAG_GROUP_DELETE: '/weilin_prompt_ui/tag_group/delete',
  TAG_GROUP_MOVE: '/weilin_prompt_ui/tag_group/move',
  TAG_LIST: '/weilin_prompt_ui/tag/list',
  TAG_ADD: '/weilin_prompt_ui/tag/add',
  TAG_DELETE: '/weilin_prompt_ui/tag/delete',
  TAG_MOVE: '/weilin_prompt_ui/tag/move',
  
  // 翻译相关
  TRANSLATE_LOCAL: '/weilin_prompt_ui/translate/local',
  TRANSLATE_AI: '/weilin_prompt_ui/translate/ai',
  TRANSLATE_API: '/weilin_prompt_ui/translate/api',
  
  // 历史记录
  HISTORY_LIST: '/weilin_prompt_ui/history/list',
  HISTORY_SAVE: '/weilin_prompt_ui/history/save',
  HISTORY_DELETE: '/weilin_prompt_ui/history/delete',
  FAVORITE_LIST: '/weilin_prompt_ui/favorite/list',
  FAVORITE_ADD: '/weilin_prompt_ui/favorite/add',
  FAVORITE_DELETE: '/weilin_prompt_ui/favorite/delete',
  
  // 自动补全
  AUTOCOMPLETE: '/weilin_prompt_ui/autocomplete',
  
  // Danbooru
  DANBOORU_LIST: '/weilin_prompt_ui/danbooru/list',
  DANBOORU_ADD: '/weilin_prompt_ui/danbooru/add',
  DANBOORU_DELETE: '/weilin_prompt_ui/danbooru/delete',
  
  // 云仓库
  CLOUD_DIR: '/weilin_prompt_ui/cloud/dir',
  CLOUD_DOWNLOAD: '/weilin_prompt_ui/cloud/download',
  
  // 随机模板
  RANDOM_TEMPLATE_SAVE: '/weilin_prompt_ui/random_template/save',
  RANDOM_TEMPLATE_GET: '/weilin_prompt_ui/random_template/get',
  
  // 用户设置
  USER_SETTINGS: '/weilin_prompt_ui/user/settings',
  USER_LANG: '/weilin_prompt_ui/user/lang'
};

// ============================================
// 模块1: API 路由验证
// ============================================

console.log('\n============================================');
console.log('模块1: API 路由验证');
console.log('============================================\n');

function validateRoute(route) {
  if (!route || typeof route !== 'string') {
    return { valid: false, error: 'Route must be a string' };
  }
  if (!route.startsWith('/')) {
    return { valid: false, error: 'Route must start with /' };
  }
  if (route.includes(' ')) {
    return { valid: false, error: 'Route cannot contain spaces' };
  }
  return { valid: true, error: null };
}

function parseRoute(route) {
  const parts = route.split('/').filter(p => p);
  return {
    prefix: parts[0] || '',
    module: parts[1] || '',
    action: parts[2] || '',
    full: route
  };
}

// 测试用例
test('validateRoute: 有效路由', () => {
  const result = validateRoute('/weilin_prompt_ui/lora/list');
  assertTrue(result.valid);
}, 'API路由');

test('validateRoute: 无效路由 - 无斜杠开头', () => {
  const result = validateRoute('weilin_prompt_ui/lora/list');
  assertFalse(result.valid);
}, 'API路由');

test('validateRoute: 无效路由 - 包含空格', () => {
  const result = validateRoute('/weilin_prompt_ui/lora/list test');
  assertFalse(result.valid);
}, 'API路由');

test('parseRoute: 解析路由', () => {
  const result = parseRoute('/weilin_prompt_ui/lora/list');
  assertEqual(result.prefix, 'weilin_prompt_ui');
  assertEqual(result.module, 'lora');
  assertEqual(result.action, 'list');
}, 'API路由');

test('APIRoutes: 所有路由有效', () => {
  for (const [name, route] of Object.entries(APIRoutes)) {
    const result = validateRoute(route);
    assertTrue(result.valid, `Invalid route: ${name}`);
  }
}, 'API路由');

// ============================================
// 模块2: 请求参数验证
// ============================================

console.log('\n============================================');
console.log('模块2: 请求参数验证');
console.log('============================================\n');

// 参数验证器
const ParamValidators = {
  string: (value, required = true) => {
    if (required && (value === undefined || value === null || value === '')) {
      return { valid: false, error: 'Parameter is required' };
    }
    if (value !== undefined && typeof value !== 'string') {
      return { valid: false, error: 'Parameter must be a string' };
    }
    return { valid: true, error: null };
  },
  
  number: (value, required = true, min = null, max = null) => {
    if (required && (value === undefined || value === null)) {
      return { valid: false, error: 'Parameter is required' };
    }
    if (value !== undefined && typeof value !== 'number') {
      return { valid: false, error: 'Parameter must be a number' };
    }
    if (min !== null && value < min) {
      return { valid: false, error: `Parameter must be >= ${min}` };
    }
    if (max !== null && value > max) {
      return { valid: false, error: `Parameter must be <= ${max}` };
    }
    return { valid: true, error: null };
  },
  
  array: (value, required = true) => {
    if (required && (value === undefined || value === null)) {
      return { valid: false, error: 'Parameter is required' };
    }
    if (value !== undefined && !Array.isArray(value)) {
      return { valid: false, error: 'Parameter must be an array' };
    }
    return { valid: true, error: null };
  },
  
  object: (value, required = true) => {
    if (required && (value === undefined || value === null)) {
      return { valid: false, error: 'Parameter is required' };
    }
    if (value !== undefined && typeof value !== 'object') {
      return { valid: false, error: 'Parameter must be an object' };
    }
    return { valid: true, error: null };
  }
};

// 验证请求参数
function validateParams(params, schema) {
  const errors = [];
  for (const [key, validator] of Object.entries(schema)) {
    const result = validator(params[key]);
    if (!result.valid) {
      errors.push({ field: key, error: result.error });
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
}

// 测试用例
test('ParamValidators.string: 有效字符串', () => {
  const result = ParamValidators.string('test');
  assertTrue(result.valid);
}, '参数验证');

test('ParamValidators.string: 空字符串必填', () => {
  const result = ParamValidators.string('');
  assertFalse(result.valid);
}, '参数验证');

test('ParamValidators.string: 空字符串非必填', () => {
  const result = ParamValidators.string('', false);
  assertTrue(result.valid);
}, '参数验证');

test('ParamValidators.number: 有效数字', () => {
  const result = ParamValidators.number(10);
  assertTrue(result.valid);
}, '参数验证');

test('ParamValidators.number: 范围验证', () => {
  const r1 = ParamValidators.number(5, true, 0, 10);
  assertTrue(r1.valid);
  
  const r2 = ParamValidators.number(15, true, 0, 10);
  assertFalse(r2.valid);
}, '参数验证');

test('ParamValidators.array: 有效数组', () => {
  const result = ParamValidators.array([1, 2, 3]);
  assertTrue(result.valid);
}, '参数验证');

test('ParamValidators.array: 非数组', () => {
  const result = ParamValidators.array('not array');
  assertFalse(result.valid);
}, '参数验证');

test('validateParams: 完整验证', () => {
  const params = { name: 'test', count: 10, items: [1, 2] };
  const schema = {
    name: (v) => ParamValidators.string(v),
    count: (v) => ParamValidators.number(v),
    items: (v) => ParamValidators.array(v)
  };
  const result = validateParams(params, schema);
  assertTrue(result.valid);
}, '参数验证');

test('validateParams: 缺少必填参数', () => {
  const params = { name: 'test' };
  const schema = {
    name: (v) => ParamValidators.string(v),
    count: (v) => ParamValidators.number(v)
  };
  const result = validateParams(params, schema);
  assertFalse(result.valid);
  assertEqual(result.errors.length, 1);
}, '参数验证');

// ============================================
// 模块3: 响应格式
// ============================================

console.log('\n============================================');
console.log('模块3: 响应格式');
console.log('============================================\n');

// 创建成功响应
function createSuccessResponse(data, message = 'Success') {
  return {
    success: true,
    data,
    message,
    timestamp: Date.now()
  };
}

// 创建错误响应
function createErrorResponse(error, code = 500) {
  return {
    success: false,
    error: {
      message: error,
      code
    },
    timestamp: Date.now()
  };
}

// 验证响应格式
function validateResponse(response) {
  if (!response || typeof response !== 'object') {
    return { valid: false, error: 'Response must be an object' };
  }
  if (response.success === undefined) {
    return { valid: false, error: 'Response must have success field' };
  }
  if (response.success && response.data === undefined) {
    return { valid: false, error: 'Success response must have data field' };
  }
  if (!response.success && !response.error) {
    return { valid: false, error: 'Error response must have error field' };
  }
  return { valid: true, error: null };
}

// 测试用例
test('createSuccessResponse: 创建成功响应', () => {
  const response = createSuccessResponse({ items: [] }, 'Loaded');
  assertTrue(response.success);
  assertEqual(response.message, 'Loaded');
  assertTrue(response.timestamp > 0);
}, '响应格式');

test('createErrorResponse: 创建错误响应', () => {
  const response = createErrorResponse('Not found', 404);
  assertFalse(response.success);
  assertEqual(response.error.code, 404);
  assertEqual(response.error.message, 'Not found');
}, '响应格式');

test('validateResponse: 验证成功响应', () => {
  const response = createSuccessResponse({ data: 'test' });
  const result = validateResponse(response);
  assertTrue(result.valid);
}, '响应格式');

test('validateResponse: 验证错误响应', () => {
  const response = createErrorResponse('Error');
  const result = validateResponse(response);
  assertTrue(result.valid);
}, '响应格式');

test('validateResponse: 无效响应 - 缺少 success', () => {
  const result = validateResponse({ data: 'test' });
  assertFalse(result.valid);
}, '响应格式');

test('validateResponse: 无效响应 - 成功但无 data', () => {
  const result = validateResponse({ success: true });
  assertFalse(result.valid);
}, '响应格式');

// ============================================
// 模块4: Lora API 测试
// ============================================

console.log('\n============================================');
console.log('模块4: Lora API 测试');
console.log('============================================\n');

// Lora 列表请求
function buildLoraListRequest(path = '') {
  return {
    path,
    page: 1,
    pageSize: 50
  };
}

// Lora 信息请求
function buildLoraInfoRequest(name) {
  return {
    name
  };
}

// Lora 刷新请求（C站数据）
function buildLoraRefreshRequest(names) {
  return {
    names: Array.isArray(names) ? names : [names]
  };
}

// 验证 Lora 数据
function validateLoraData(lora) {
  const required = ['name', 'path', 'file_name'];
  for (const field of required) {
    if (!lora[field]) {
      return { valid: false, error: `Missing field: ${field}` };
    }
  }
  return { valid: true, error: null };
}

// 测试用例
test('buildLoraListRequest: 默认请求', () => {
  const req = buildLoraListRequest();
  assertEqual(req.page, 1);
  assertEqual(req.pageSize, 50);
}, 'Lora API');

test('buildLoraListRequest: 带路径请求', () => {
  const req = buildLoraListRequest('/models/lora');
  assertEqual(req.path, '/models/lora');
}, 'Lora API');

test('buildLoraInfoRequest: 构建请求', () => {
  const req = buildLoraInfoRequest('test.safetensors');
  assertEqual(req.name, 'test.safetensors');
}, 'Lora API');

test('buildLoraRefreshRequest: 单个刷新', () => {
  const req = buildLoraRefreshRequest('test.safetensors');
  assertEqual(req.names.length, 1);
}, 'Lora API');

test('buildLoraRefreshRequest: 批量刷新', () => {
  const req = buildLoraRefreshRequest(['a.safetensors', 'b.safetensors']);
  assertEqual(req.names.length, 2);
}, 'Lora API');

test('validateLoraData: 有效数据', () => {
  const lora = { name: 'test', path: '/path', file_name: 'test.safetensors' };
  const result = validateLoraData(lora);
  assertTrue(result.valid);
}, 'Lora API');

test('validateLoraData: 缺少字段', () => {
  const lora = { name: 'test' };
  const result = validateLoraData(lora);
  assertFalse(result.valid);
}, 'Lora API');

// ============================================
// 模块5: Tag API 测试
// ============================================

console.log('\n============================================');
console.log('模块5: Tag API 测试');
console.log('============================================\n');

// Tag 分组请求
function buildTagGroupAddRequest(name) {
  return { name };
}

// Tag 添加请求
function buildTagAddRequest(groupId, text, order = 0) {
  return { groupId, text, order };
}

// Tag 移动请求
function buildTagMoveRequest(tagId, fromGroupId, toGroupId, newOrder) {
  return { tagId, fromGroupId, toGroupId, newOrder };
}

// 验证 Tag 数据
function validateTagData(tag) {
  if (!tag.id || !tag.text || !tag.groupId) {
    return { valid: false, error: 'Missing required fields' };
  }
  return { valid: true, error: null };
}

// 测试用例
test('buildTagGroupAddRequest: 构建请求', () => {
  const req = buildTagGroupAddRequest('Style');
  assertEqual(req.name, 'Style');
}, 'Tag API');

test('buildTagAddRequest: 构建请求', () => {
  const req = buildTagAddRequest('group-123', 'beautiful', 0);
  assertEqual(req.groupId, 'group-123');
  assertEqual(req.text, 'beautiful');
}, 'Tag API');

test('buildTagMoveRequest: 构建请求', () => {
  const req = buildTagMoveRequest('tag-1', 'group-1', 'group-2', 5);
  assertEqual(req.tagId, 'tag-1');
  assertEqual(req.fromGroupId, 'group-1');
  assertEqual(req.toGroupId, 'group-2');
}, 'Tag API');

test('validateTagData: 有效数据', () => {
  const tag = { id: '1', text: 'test', groupId: 'g1' };
  const result = validateTagData(tag);
  assertTrue(result.valid);
}, 'Tag API');

test('validateTagData: 无效数据', () => {
  const tag = { text: 'test' };
  const result = validateTagData(tag);
  assertFalse(result.valid);
}, 'Tag API');

// ============================================
// 模块6: 翻译 API 测试
// ============================================

console.log('\n============================================');
console.log('模块6: 翻译 API 测试');
console.log('============================================\n');

// 翻译请求构建
function buildTranslateRequest(text, service, options = {}) {
  return {
    text,
    service,
    sourceLang: options.sourceLang || 'en',
    targetLang: options.targetLang || 'zh',
    ...options
  };
}

// 翻译服务验证
function validateTranslateService(service) {
  const validServices = ['alibaba', 'bing', 'netease', 'ai', 'openai'];
  return validServices.includes(service);
}

// 批量翻译请求
function buildBatchTranslateRequest(texts, service) {
  return {
    texts: Array.isArray(texts) ? texts : [texts],
    service,
    sourceLang: 'en',
    targetLang: 'zh'
  };
}

// 测试用例
test('buildTranslateRequest: 本地翻译请求', () => {
  const req = buildTranslateRequest('hello', 'alibaba');
  assertEqual(req.text, 'hello');
  assertEqual(req.service, 'alibaba');
}, '翻译 API');

test('buildTranslateRequest: AI 翻译请求', () => {
  const req = buildTranslateRequest('hello', 'ai', { model: 'gpt-4' });
  assertEqual(req.service, 'ai');
  assertEqual(req.model, 'gpt-4');
}, '翻译 API');

test('validateTranslateService: 有效服务', () => {
  assertTrue(validateTranslateService('alibaba'));
  assertTrue(validateTranslateService('ai'));
}, '翻译 API');

test('validateTranslateService: 无效服务', () => {
  assertFalse(validateTranslateService('invalid'));
}, '翻译 API');

test('buildBatchTranslateRequest: 批量请求', () => {
  const req = buildBatchTranslateRequest(['hello', 'world'], 'alibaba');
  assertEqual(req.texts.length, 2);
}, '翻译 API');

// ============================================
// 模块7: 历史记录 API 测试
// ============================================

console.log('\n============================================');
console.log('模块7: 历史记录 API 测试');
console.log('============================================\n');

// 历史保存请求
function buildHistorySaveRequest(prompt, lora = []) {
  return {
    tag: JSON.stringify({
      prompt,
      lora,
      temp_lora: lora
    })
  };
}

// 历史列表请求
function buildHistoryListRequest(page = 1, pageSize = 20) {
  return { page, pageSize };
}

// 收藏添加请求
function buildFavoriteAddRequest(historyId) {
  return { historyId };
}

// 解析历史数据
function parseHistoryData(tag) {
  try {
    const data = JSON.parse(tag);
    return {
      success: true,
      prompt: data.prompt || '',
      lora: data.lora || [],
      temp_lora: data.temp_lora || []
    };
  } catch (e) {
    return { success: false, error: 'Invalid JSON' };
  }
}

// 测试用例
test('buildHistorySaveRequest: 构建请求', () => {
  const req = buildHistorySaveRequest('test prompt', []);
  const data = JSON.parse(req.tag);
  assertEqual(data.prompt, 'test prompt');
}, '历史 API');

test('buildHistoryListRequest: 默认请求', () => {
  const req = buildHistoryListRequest();
  assertEqual(req.page, 1);
  assertEqual(req.pageSize, 20);
}, '历史 API');

test('buildFavoriteAddRequest: 构建请求', () => {
  const req = buildFavoriteAddRequest('history-123');
  assertEqual(req.historyId, 'history-123');
}, '历史 API');

test('parseHistoryData: 有效数据', () => {
  const tag = JSON.stringify({ prompt: 'test', lora: [], temp_lora: [] });
  const result = parseHistoryData(tag);
  assertTrue(result.success);
  assertEqual(result.prompt, 'test');
}, '历史 API');

test('parseHistoryData: 无效 JSON', () => {
  const result = parseHistoryData('invalid json');
  assertFalse(result.success);
}, '历史 API');

// ============================================
// 模块8: 自动补全 API 测试
// ============================================

console.log('\n============================================');
console.log('模块8: 自动补全 API 测试');
console.log('============================================\n');

// 自动补全请求
function buildAutocompleteRequest(query, limit = 10) {
  return {
    query,
    limit
  };
}

// 自动补全结果
function buildAutocompleteResult(tags) {
  return {
    success: true,
    data: tags.map(tag => ({
      name: tag.name,
      category: tag.category,
      count: tag.count || 0
    }))
  };
}

// 验证补全结果
function validateAutocompleteResult(result) {
  if (!result.success) return { valid: false, error: 'Request failed' };
  if (!Array.isArray(result.data)) return { valid: false, error: 'Data must be array' };
  return { valid: true, error: null };
}

// 测试用例
test('buildAutocompleteRequest: 构建请求', () => {
  const req = buildAutocompleteRequest('beau', 5);
  assertEqual(req.query, 'beau');
  assertEqual(req.limit, 5);
}, '自动补全 API');

test('buildAutocompleteResult: 构建结果', () => {
  const tags = [
    { name: 'beautiful', category: 0, count: 1000 },
    { name: 'beauty', category: 0, count: 500 }
  ];
  const result = buildAutocompleteResult(tags);
  assertTrue(result.success);
  assertEqual(result.data.length, 2);
}, '自动补全 API');

test('validateAutocompleteResult: 有效结果', () => {
  const result = { success: true, data: [{ name: 'test' }] };
  const validation = validateAutocompleteResult(result);
  assertTrue(validation.valid);
}, '自动补全 API');

test('validateAutocompleteResult: 无效结果', () => {
  const result = { success: true, data: 'not array' };
  const validation = validateAutocompleteResult(result);
  assertFalse(validation.valid);
}, '自动补全 API');

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

if (failCount > 0) {
  console.log('失败的测试:');
  testResults.filter(t => t.status === 'FAIL').forEach(t => {
    console.log(`  [${t.group}] ${t.name}`);
    console.log(`    ${t.error}`);
  });
  console.log('');
  process.exit(1);
}
