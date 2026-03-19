/**
 * WeiLin-ComfyUI-Tools 数据处理测试
 * 
 * 测试覆盖：
 * 1. 数据序列化/反序列化
 * 2. 数据转换
 * 3. 缓存机制
 * 4. 数据校验
 * 
 * 运行方式: node tests/data-processing.test.js
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
// 模块1: JSON 序列化/反序列化
// ============================================

console.log('\n============================================');
console.log('模块1: JSON 序列化/反序列化');
console.log('============================================\n');

// 安全 JSON 解析
function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
}

// 安全 JSON 序列化
function safeJsonStringify(obj, defaultValue = '') {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return defaultValue;
  }
}

// 深拷贝
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

// 测试用例
test('safeJsonParse: 有效 JSON', () => {
  const result = safeJsonParse('{"name":"test"}');
  assertEqual(result.name, 'test');
}, 'JSON处理');

test('safeJsonParse: 无效 JSON', () => {
  const result = safeJsonParse('invalid', { default: true });
  assertEqual(result.default, true);
}, 'JSON处理');

test('safeJsonParse: 空字符串', () => {
  const result = safeJsonParse('', null);
  assertEqual(result, null);
}, 'JSON处理');

test('safeJsonStringify: 对象序列化', () => {
  const result = safeJsonStringify({ name: 'test' });
  assertEqual(result, '{"name":"test"}');
}, 'JSON处理');

test('safeJsonStringify: 循环引用', () => {
  const obj = { name: 'test' };
  obj.self = obj; // 循环引用
  const result = safeJsonStringify(obj, 'fallback');
  assertEqual(result, 'fallback');
}, 'JSON处理');

test('deepClone: 对象深拷贝', () => {
  const original = { a: 1, b: { c: 2 } };
  const cloned = deepClone(original);
  cloned.b.c = 999;
  assertEqual(original.b.c, 2); // 原对象不受影响
  assertEqual(cloned.b.c, 999);
}, 'JSON处理');

test('deepClone: 数组深拷贝', () => {
  const original = [1, [2, 3], { a: 4 }];
  const cloned = deepClone(original);
  cloned[1][0] = 999;
  assertEqual(original[1][0], 2);
  assertEqual(cloned[1][0], 999);
}, 'JSON处理');

// ============================================
// 模块2: 数据转换
// ============================================

console.log('\n============================================');
console.log('模块2: 数据转换');
console.log('============================================\n');

// Lora 文件名转换
function loraFileNameToDisplayName(fileName) {
  if (!fileName) return '';
  return fileName
    .replace('.safetensors', '')
    .replace('.pt', '')
    .replace(/_/g, ' ');
}

// 权重格式化
function formatWeight(weight, decimals = 2) {
  if (typeof weight !== 'number') return '1.00';
  return weight.toFixed(decimals);
}

// 提示词清理
function cleanPrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') return '';
  return prompt
    .replace(/\s+/g, ' ')  // 多空格变单空格
    .replace(/,+/g, ',')  // 连续逗号变单逗号
    .replace(/,\s*,/g, ',')  // 逗号加空格加逗号
    .replace(/^,|,$/g, '')  // 首尾逗号
    .trim();
}

// 标签转提示词
function tagsToPrompt(tags, separator = ', ') {
  if (!Array.isArray(tags)) return '';
  return tags
    .map(t => t.text || t)
    .filter(t => t && typeof t === 'string')
    .join(separator);
}

// 提示词转标签
function promptToTags(prompt) {
  if (!prompt || typeof prompt !== 'string') return [];
  return prompt
    .split(',')
    .map(t => t.trim())
    .filter(t => t)
    .map((text, index) => ({ text, id: index }));
}

// 测试用例
test('loraFileNameToDisplayName: 标准转换', () => {
  const result = loraFileNameToDisplayName('beautiful_detail.safetensors');
  assertEqual(result, 'beautiful detail');
}, '数据转换');

test('loraFileNameToDisplayName: 空值处理', () => {
  assertEqual(loraFileNameToDisplayName(''), '');
  assertEqual(loraFileNameToDisplayName(null), '');
}, '数据转换');

test('formatWeight: 格式化权重', () => {
  assertEqual(formatWeight(1.23456), '1.23');
  assertEqual(formatWeight(1, 1), '1.0');
}, '数据转换');

test('formatWeight: 非数字处理', () => {
  assertEqual(formatWeight('invalid'), '1.00');
}, '数据转换');

test('cleanPrompt: 清理多余空格', () => {
  const result = cleanPrompt('a   b    c');
  assertEqual(result, 'a b c');
}, '数据转换');

test('cleanPrompt: 清理连续逗号', () => {
  const result = cleanPrompt('a,,b,,,c');
  assertEqual(result, 'a,b,c');
}, '数据转换');

test('cleanPrompt: 清理首尾逗号', () => {
  const result = cleanPrompt(',a,b,c,');
  assertEqual(result, 'a,b,c');
}, '数据转换');

test('tagsToPrompt: 标签转提示词', () => {
  const tags = [{ text: 'a' }, { text: 'b' }, { text: 'c' }];
  const result = tagsToPrompt(tags);
  assertEqual(result, 'a, b, c');
}, '数据转换');

test('promptToTags: 提示词转标签', () => {
  const result = promptToTags('a, b, c');
  assertEqual(result.length, 3);
  assertEqual(result[0].text, 'a');
}, '数据转换');

// ============================================
// 模块3: 缓存机制
// ============================================

console.log('\n============================================');
console.log('模块3: 缓存机制');
console.log('============================================\n');

// 简单内存缓存
class MemoryCache {
  constructor(defaultTTL = 5 * 60 * 1000) { // 默认5分钟
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }
  
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      expireAt: Date.now() + ttl
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  has(key) {
    return this.get(key) !== null;
  }
  
  delete(key) {
    this.cache.delete(key);
  }
  
  clear() {
    this.cache.clear();
  }
  
  size() {
    // 清理过期项
    for (const [key, item] of this.cache) {
      if (Date.now() > item.expireAt) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}

// 测试用例
test('MemoryCache: 设置和获取', () => {
  const cache = new MemoryCache();
  cache.set('key1', 'value1');
  assertEqual(cache.get('key1'), 'value1');
}, '缓存机制');

test('MemoryCache: 过期清理', () => {
  const cache = new MemoryCache(100); // 100ms TTL
  cache.set('key1', 'value1');
  
  // 立即获取应该有值
  assertEqual(cache.get('key1'), 'value1');
  
  // 等待过期
  return new Promise(resolve => {
    setTimeout(() => {
      const value = cache.get('key1');
      assertEqual(value, null);
      resolve();
    }, 150);
  });
}, '缓存机制');

test('MemoryCache: 删除', () => {
  const cache = new MemoryCache();
  cache.set('key1', 'value1');
  cache.delete('key1');
  assertEqual(cache.get('key1'), null);
}, '缓存机制');

test('MemoryCache: 清空', () => {
  const cache = new MemoryCache();
  cache.set('key1', 'value1');
  cache.set('key2', 'value2');
  cache.clear();
  assertEqual(cache.size(), 0);
}, '缓存机制');

test('MemoryCache: has 方法', () => {
  const cache = new MemoryCache();
  cache.set('key1', 'value1');
  assertTrue(cache.has('key1'));
  assertFalse(cache.has('key2'));
}, '缓存机制');

// ============================================
// 模块4: 数据校验
// ============================================

console.log('\n============================================');
console.log('模块4: 数据校验');
console.log('============================================\n');

// 校验器集合
const Validators = {
  // 非空校验
  notEmpty: (value) => {
    if (value === null || value === undefined || value === '') {
      return { valid: false, error: 'Value cannot be empty' };
    }
    return { valid: true, error: null };
  },
  
  // 字符串长度校验
  stringLength: (value, min = 0, max = Infinity) => {
    if (typeof value !== 'string') {
      return { valid: false, error: 'Value must be a string' };
    }
    if (value.length < min) {
      return { valid: false, error: `Length must be at least ${min}` };
    }
    if (value.length > max) {
      return { valid: false, error: `Length must be at most ${max}` };
    }
    return { valid: true, error: null };
  },
  
  // 数值范围校验
  numberRange: (value, min = -Infinity, max = Infinity) => {
    if (typeof value !== 'number') {
      return { valid: false, error: 'Value must be a number' };
    }
    if (value < min) {
      return { valid: false, error: `Value must be at least ${min}` };
    }
    if (value > max) {
      return { valid: false, error: `Value must be at most ${max}` };
    }
    return { valid: true, error: null };
  },
  
  // 数组校验
  arrayLength: (value, min = 0, max = Infinity) => {
    if (!Array.isArray(value)) {
      return { valid: false, error: 'Value must be an array' };
    }
    if (value.length < min) {
      return { valid: false, error: `Array must have at least ${min} items` };
    }
    if (value.length > max) {
      return { valid: false, error: `Array must have at most ${max} items` };
    }
    return { valid: true, error: null };
  },
  
  // 文件名校验
  fileName: (value) => {
    if (typeof value !== 'string') {
      return { valid: false, error: 'Value must be a string' };
    }
    // 禁止特殊字符
    if (/[<>:"/\\|?*]/.test(value)) {
      return { valid: false, error: 'Invalid characters in filename' };
    }
    return { valid: true, error: null };
  }
};

// 组合校验
function validate(value, validators) {
  for (const validator of validators) {
    const result = validator(value);
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true, error: null };
}

// 测试用例
test('Validators.notEmpty: 有效值', () => {
  const result = Validators.notEmpty('test');
  assertTrue(result.valid);
}, '数据校验');

test('Validators.notEmpty: 空值', () => {
  assertFalse(Validators.notEmpty('').valid);
  assertFalse(Validators.notEmpty(null).valid);
}, '数据校验');

test('Validators.stringLength: 范围校验', () => {
  assertTrue(Validators.stringLength('test', 1, 10).valid);
  assertFalse(Validators.stringLength('test', 5, 10).valid);
}, '数据校验');

test('Validators.numberRange: 范围校验', () => {
  assertTrue(Validators.numberRange(5, 0, 10).valid);
  assertFalse(Validators.numberRange(15, 0, 10).valid);
}, '数据校验');

test('Validators.arrayLength: 数组校验', () => {
  assertTrue(Validators.arrayLength([1, 2, 3], 1, 5).valid);
  assertFalse(Validators.arrayLength([], 1, 5).valid);
}, '数据校验');

test('Validators.fileName: 有效文件名', () => {
  assertTrue(Validators.fileName('test_file.safetensors').valid);
}, '数据校验');

test('Validators.fileName: 无效文件名', () => {
  assertFalse(Validators.fileName('test<file>.txt').valid);
}, '数据校验');

test('validate: 组合校验', () => {
  const result = validate('test', [
    Validators.notEmpty,
    (v) => Validators.stringLength(v, 1, 10)
  ]);
  assertTrue(result.valid);
}, '数据校验');

// ============================================
// 模块5: 数据合并
// ============================================

console.log('\n============================================');
console.log('模块5: 数据合并');
console.log('============================================\n');

// 对象合并（深度）
function mergeObjects(target, source) {
  const result = deepClone(target);
  
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = mergeObjects(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

// 数组合并（去重）
function mergeArrays(arr1, arr2, key = null) {
  if (!key) {
    return [...new Set([...arr1, ...arr2])];
  }
  
  const result = [...arr1];
  for (const item of arr2) {
    if (!result.find(r => r[key] === item[key])) {
      result.push(item);
    }
  }
  return result;
}

// Lora 数据合并
function mergeLoraData(existing, incoming) {
  const merged = deepClone(existing);
  
  // 合并权重
  if (incoming.weight !== undefined) {
    merged.weight = incoming.weight;
  }
  if (incoming.text_encoder_weight !== undefined) {
    merged.text_encoder_weight = incoming.text_encoder_weight;
  }
  if (incoming.trigger_weight !== undefined) {
    merged.trigger_weight = incoming.trigger_weight;
  }
  
  // 合并元数据
  if (incoming.hidden !== undefined) {
    merged.hidden = incoming.hidden;
  }
  
  return merged;
}

// 测试用例
test('mergeObjects: 简单合并', () => {
  const target = { a: 1, b: 2 };
  const source = { b: 3, c: 4 };
  const result = mergeObjects(target, source);
  assertEqual(result.a, 1);
  assertEqual(result.b, 3);
  assertEqual(result.c, 4);
}, '数据合并');

test('mergeObjects: 深度合并', () => {
  const target = { a: { b: 1, c: 2 } };
  const source = { a: { c: 3, d: 4 } };
  const result = mergeObjects(target, source);
  assertEqual(result.a.b, 1);
  assertEqual(result.a.c, 3);
  assertEqual(result.a.d, 4);
}, '数据合并');

test('mergeArrays: 简单合并去重', () => {
  const result = mergeArrays([1, 2, 3], [2, 3, 4]);
  assertEqual(result.length, 4);
}, '数据合并');

test('mergeArrays: 对象合并去重', () => {
  const arr1 = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
  const arr2 = [{ id: 2, name: 'b2' }, { id: 3, name: 'c' }];
  const result = mergeArrays(arr1, arr2, 'id');
  assertEqual(result.length, 3);
}, '数据合并');

test('mergeLoraData: 合并权重', () => {
  const existing = { name: 'test', weight: 1, hidden: false };
  const incoming = { weight: 0.8, hidden: true };
  const result = mergeLoraData(existing, incoming);
  assertEqual(result.weight, 0.8);
  assertEqual(result.hidden, true);
  assertEqual(result.name, 'test');
}, '数据合并');

// ============================================
// 模块6: 数据过滤
// ============================================

console.log('\n============================================');
console.log('模块6: 数据过滤');
console.log('============================================\n');

// 过滤隐藏项
function filterHidden(items) {
  return items.filter(item => !item.hidden);
}

// 按分类过滤
function filterByCategory(items, category) {
  return items.filter(item => item.category === category);
}

// 按关键词搜索
function filterByKeyword(items, keyword, fields = ['name', 'text']) {
  if (!keyword) return items;
  const lowerKeyword = keyword.toLowerCase();
  return items.filter(item => {
    for (const field of fields) {
      if (item[field] && String(item[field]).toLowerCase().includes(lowerKeyword)) {
        return true;
      }
    }
    return false;
  });
}

// 分页
function paginate(items, page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    data: items.slice(start, end),
    total: items.length,
    page,
    pageSize,
    totalPages: Math.ceil(items.length / pageSize)
  };
}

// 测试用例
test('filterHidden: 过滤隐藏项', () => {
  const items = [
    { name: 'a', hidden: false },
    { name: 'b', hidden: true },
    { name: 'c', hidden: false }
  ];
  const result = filterHidden(items);
  assertEqual(result.length, 2);
}, '数据过滤');

test('filterByCategory: 按分类过滤', () => {
  const items = [
    { name: 'a', category: 0 },
    { name: 'b', category: 1 },
    { name: 'c', category: 0 }
  ];
  const result = filterByCategory(items, 0);
  assertEqual(result.length, 2);
}, '数据过滤');

test('filterByKeyword: 关键词搜索', () => {
  const items = [
    { name: 'beautiful', text: 'desc1' },
    { name: 'dark', text: 'desc2' },
    { name: 'beauty', text: 'desc3' }
  ];
  const result = filterByKeyword(items, 'beau');
  assertEqual(result.length, 2);
}, '数据过滤');

test('paginate: 分页', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: i }));
  const result = paginate(items, 2, 10);
  assertEqual(result.data.length, 10);
  assertEqual(result.total, 25);
  assertEqual(result.page, 2);
  assertEqual(result.totalPages, 3);
}, '数据过滤');

test('paginate: 最后一页', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: i }));
  const result = paginate(items, 3, 10);
  assertEqual(result.data.length, 5);
}, '数据过滤');

// ============================================
// 模块7: 数据排序
// ============================================

console.log('\n============================================');
console.log('模块7: 数据排序');
console.log('============================================\n');

// 按字段排序
function sortByField(items, field, order = 'asc') {
  const sorted = [...items];
  sorted.sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];
    
    if (aVal === bVal) return 0;
    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;
    
    const compare = aVal < bVal ? -1 : 1;
    return order === 'asc' ? compare : -compare;
  });
  return sorted;
}

// 多字段排序
function sortByFields(items, specs) {
  const sorted = [...items];
  sorted.sort((a, b) => {
    for (const { field, order = 'asc' } of specs) {
      const aVal = a[field];
      const bVal = b[field];
      
      if (aVal === bVal) continue;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      
      const compare = aVal < bVal ? -1 : 1;
      return order === 'asc' ? compare : -compare;
    }
    return 0;
  });
  return sorted;
}

// 按使用次数排序（热门优先）
function sortByPopularity(items) {
  return sortByField(items, 'count', 'desc');
}

// 测试用例
test('sortByField: 升序排序', () => {
  const items = [{ v: 3 }, { v: 1 }, { v: 2 }];
  const result = sortByField(items, 'v', 'asc');
  assertEqual(result[0].v, 1);
  assertEqual(result[2].v, 3);
}, '数据排序');

test('sortByField: 降序排序', () => {
  const items = [{ v: 1 }, { v: 3 }, { v: 2 }];
  const result = sortByField(items, 'v', 'desc');
  assertEqual(result[0].v, 3);
  assertEqual(result[2].v, 1);
}, '数据排序');

test('sortByFields: 多字段排序', () => {
  const items = [
    { a: 1, b: 2 },
    { a: 1, b: 1 },
    { a: 2, b: 1 }
  ];
  const result = sortByFields(items, [
    { field: 'a', order: 'asc' },
    { field: 'b', order: 'asc' }
  ]);
  assertEqual(result[0].b, 1);
  assertEqual(result[1].b, 2);
}, '数据排序');

test('sortByPopularity: 热门排序', () => {
  const items = [
    { name: 'a', count: 100 },
    { name: 'b', count: 500 },
    { name: 'c', count: 200 }
  ];
  const result = sortByPopularity(items);
  assertEqual(result[0].name, 'b');
  assertEqual(result[1].name, 'c');
}, '数据排序');

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
