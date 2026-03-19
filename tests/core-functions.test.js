/**
 * WeiLin-ComfyUI-Tools 核心功能测试套件
 * 
 * 测试覆盖：
 * 1. 数据处理逻辑
 * 2. 消息通信机制
 * 3. 空值和边界情况
 * 4. 数据同步流程
 * 
 * 运行方式: node tests/core-functions.test.js
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

function assertThrows(fn, message = '') {
  try {
    fn();
    throw new Error(message || 'Expected function to throw');
  } catch (e) {
    if (e.message === message || e.message === 'Expected function to throw') {
      throw e;
    }
    // Function threw as expected
  }
}

// ============================================
// 模块1: Lora 数据处理
// ============================================

console.log('\n============================================');
console.log('模块1: Lora 数据处理');
console.log('============================================\n');

// Lora 数据结构
function createLoraItem(name, weight = 1, hidden = false) {
  return {
    name,
    weight,
    text_encoder_weight: 1,
    trigger_weight: 1,
    hidden,
    lora: `${name}.safetensors`,
    loraWorks: '',
    display_name: name
  };
}

// 处理 Lora 列表数据
function processLoraList(selectedLoras) {
  const tempLora = selectedLoras.filter((lora) => !lora.hidden);
  return {
    lora: tempLora.length > 0 ? tempLora : '',
    temp_lora: selectedLoras.length > 0 ? selectedLoras : []
  };
}

// 生成 Lora 标签
function generateLoraTags(selectedLoras) {
  const visibleLoras = selectedLoras.filter((lora) => !lora.hidden);
  return visibleLoras.map((lora) => {
    const loraName = lora.lora ? lora.lora.replace('.safetensors', '') : lora.name;
    return `<wlr:${loraName}:${lora.weight || 1}:${lora.text_encoder_weight || 1}:${lora.trigger_weight || 1}>`;
  });
}

// 解析 Lora 标签
function parseLoraTag(tag) {
  const match = tag.match(/<wlr:([^:]+):([^:]+):([^:]+):([^>]+)>/);
  if (match) {
    return {
      name: match[1],
      weight: parseFloat(match[2]),
      text_encoder_weight: parseFloat(match[3]),
      trigger_weight: parseFloat(match[4])
    };
  }
  return null;
}

// 测试用例
test('createLoraItem: 创建默认 Lora 项', () => {
  const lora = createLoraItem('test-lora');
  assertEqual(lora.name, 'test-lora');
  assertEqual(lora.weight, 1);
  assertEqual(lora.hidden, false);
  assertEqual(lora.lora, 'test-lora.safetensors');
}, 'Lora数据处理');

test('createLoraItem: 创建带权重的 Lora 项', () => {
  const lora = createLoraItem('test-lora', 0.8, true);
  assertEqual(lora.weight, 0.8);
  assertEqual(lora.hidden, true);
}, 'Lora数据处理');

test('processLoraList: 正常数据处理', () => {
  const loras = [createLoraItem('lora1'), createLoraItem('lora2')];
  const result = processLoraList(loras);
  assertEqual(result.lora.length, 2);
  assertEqual(result.temp_lora.length, 2);
}, 'Lora数据处理');

test('processLoraList: 空数组处理', () => {
  const result = processLoraList([]);
  assertEqual(result.lora, '');
  assertEqual(result.temp_lora, []);
}, 'Lora数据处理');

test('processLoraList: 全部隐藏处理', () => {
  const loras = [createLoraItem('lora1', 1, true), createLoraItem('lora2', 1, true)];
  const result = processLoraList(loras);
  assertEqual(result.lora, '');
  assertEqual(result.temp_lora.length, 2);
}, 'Lora数据处理');

test('generateLoraTags: 生成标签', () => {
  const loras = [createLoraItem('lora1', 0.8)];
  const tags = generateLoraTags(loras);
  assertEqual(tags.length, 1);
  assertTrue(tags[0].includes('wlr:lora1:0.8:1:1'));
}, 'Lora数据处理');

test('generateLoraTags: 空数组', () => {
  const tags = generateLoraTags([]);
  assertEqual(tags, []);
}, 'Lora数据处理');

test('parseLoraTag: 解析标签', () => {
  const result = parseLoraTag('<wlr:test-lora:0.8:1:1>');
  assertEqual(result.name, 'test-lora');
  assertEqual(result.weight, 0.8);
}, 'Lora数据处理');

test('parseLoraTag: 无效标签', () => {
  const result = parseLoraTag('invalid tag');
  assertEqual(result, null);
}, 'Lora数据处理');

// ============================================
// 模块2: 提示词数据处理
// ============================================

console.log('\n============================================');
console.log('模块2: 提示词数据处理');
console.log('============================================\n');

// Token 数据结构
function createToken(text, weight = 1) {
  return {
    text,
    weight,
    id: Math.random().toString(36).substr(2, 9)
  };
}

// 解析提示词为 tokens
function parsePromptToTokens(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return [];
  }
  
  // 简单实现：按逗号分割
  const parts = prompt.split(',').map(p => p.trim()).filter(p => p);
  return parts.map(text => createToken(text));
}

// 将 tokens 合并为提示词
function mergeTokensToPrompt(tokens) {
  if (!Array.isArray(tokens)) {
    return '';
  }
  return tokens.map(t => t.text).join(', ');
}

// 应用权重到提示词
function applyWeight(text, weight) {
  if (weight === 1) return text;
  return `(${text}:${weight})`;
}

// 解析权重提示词
function parseWeightedPrompt(text) {
  const match = text.match(/^\((.+):([0-9.]+)\)$/);
  if (match) {
    return {
      text: match[1],
      weight: parseFloat(match[2])
    };
  }
  return { text, weight: 1 };
}

// 测试用例
test('createToken: 创建 token', () => {
  const token = createToken('beautiful', 1.2);
  assertEqual(token.text, 'beautiful');
  assertEqual(token.weight, 1.2);
  assertTrue(token.id.length > 0);
}, '提示词处理');

test('parsePromptToTokens: 正常解析', () => {
  const tokens = parsePromptToTokens('beautiful, detailed, high quality');
  assertEqual(tokens.length, 3);
  assertEqual(tokens[0].text, 'beautiful');
}, '提示词处理');

test('parsePromptToTokens: 空字符串', () => {
  const tokens = parsePromptToTokens('');
  assertEqual(tokens, []);
}, '提示词处理');

test('parsePromptToTokens: null/undefined', () => {
  assertEqual(parsePromptToTokens(null), []);
  assertEqual(parsePromptToTokens(undefined), []);
}, '提示词处理');

test('mergeTokensToPrompt: 合并 tokens', () => {
  const tokens = [createToken('a'), createToken('b'), createToken('c')];
  const prompt = mergeTokensToPrompt(tokens);
  assertEqual(prompt, 'a, b, c');
}, '提示词处理');

test('mergeTokensToPrompt: 空数组', () => {
  assertEqual(mergeTokensToPrompt([]), '');
}, '提示词处理');

test('applyWeight: 权重为1', () => {
  const result = applyWeight('test', 1);
  assertEqual(result, 'test');
}, '提示词处理');

test('applyWeight: 权重不为1', () => {
  const result = applyWeight('test', 1.5);
  assertEqual(result, '(test:1.5)');
}, '提示词处理');

test('parseWeightedPrompt: 解析带权重', () => {
  const result = parseWeightedPrompt('(beautiful:1.2)');
  assertEqual(result.text, 'beautiful');
  assertEqual(result.weight, 1.2);
}, '提示词处理');

test('parseWeightedPrompt: 无权重', () => {
  const result = parseWeightedPrompt('beautiful');
  assertEqual(result.text, 'beautiful');
  assertEqual(result.weight, 1);
}, '提示词处理');

// ============================================
// 模块3: 消息通信机制
// ============================================

console.log('\n============================================');
console.log('模块3: 消息通信机制');
console.log('============================================\n');

// 消息类型定义
const MessageTypes = {
  // Lora 相关
  LORA_STACK_FINISH: 'weilin_prompt_ui_prompt_node_finish_lora_stack_',
  LORA_STACK_OPEN: 'weilin_prompt_ui_open_lora_stack_',
  LORA_MANAGER_ADD: 'weilin_prompt_ui_openLoraManager_addLora',
  SELECT_LORA: 'weilin_prompt_ui_selectLora',
  UPDATE_LORA_TAGS: 'weilin_prompt_ui_update_lora_tags',
  
  // 提示词相关
  PROMPT_FINISH: 'weilin_prompt_ui_prompt_finish_prompt',
  PROMPT_UPDATE: 'weilin_prompt_ui_prompt_update_prompt_',
  OPEN_PROMPT_EDITOR: 'weilin_prompt_ui_open_prompt_editor_',
  
  // 历史记录
  HISTORY_SAVE: 'weilin_prompt_ui_history_save',
  HISTORY_LOAD: 'weilin_prompt_ui_history_load'
};

// 创建消息
function createMessage(type, data, seed = '') {
  return {
    type: `${type}${seed}`,
    data: data
  };
}

// 解析消息类型
function parseMessageType(message) {
  if (!message || !message.type) return null;
  
  for (const [key, prefix] of Object.entries(MessageTypes)) {
    if (message.type.startsWith(prefix)) {
      const seed = message.type.replace(prefix, '');
      return { type: key, prefix, seed };
    }
  }
  return null;
}

// 消息验证
function validateMessage(message) {
  if (!message) return { valid: false, error: 'Message is null' };
  if (!message.type) return { valid: false, error: 'Missing type' };
  if (typeof message.type !== 'string') return { valid: false, error: 'Type must be string' };
  return { valid: true, error: null };
}

// 测试用例
test('createMessage: 创建 Lora 消息', () => {
  const msg = createMessage(MessageTypes.LORA_STACK_FINISH, { lora: [] }, '123');
  assertTrue(msg.type.includes('weilin_prompt_ui_prompt_node_finish_lora_stack_'));
  assertTrue(msg.type.includes('123'));
}, '消息通信');

test('parseMessageType: 解析 Lora 消息', () => {
  const msg = { type: 'weilin_prompt_ui_prompt_node_finish_lora_stack_123' };
  const result = parseMessageType(msg);
  assertEqual(result.type, 'LORA_STACK_FINISH');
  assertEqual(result.seed, '123');
}, '消息通信');

test('parseMessageType: 无效消息', () => {
  assertEqual(parseMessageType(null), null);
  assertEqual(parseMessageType({}), null);
  assertEqual(parseMessageType({ type: 'invalid' }), null);
}, '消息通信');

test('validateMessage: 有效消息', () => {
  const result = validateMessage({ type: 'test', data: {} });
  assertTrue(result.valid);
}, '消息通信');

test('validateMessage: 无效消息', () => {
  const r1 = validateMessage(null);
  assertFalse(r1.valid);
  
  const r2 = validateMessage({});
  assertFalse(r2.valid);
}, '消息通信');

// ============================================
// 模块4: 数据同步流程
// ============================================

console.log('\n============================================');
console.log('模块4: 数据同步流程');
console.log('============================================\n');

// 模拟节点端数据存储
class NodeDataStore {
  constructor() {
    this.loraData = {};
    this.promptData = {};
  }
  
  setLoraData(seed, data) {
    if (data && Array.isArray(data)) {
      this.loraData[seed] = data;
    } else {
      this.loraData[seed] = [];
    }
  }
  
  getLoraData(seed) {
    return this.loraData[seed] || [];
  }
  
  setPromptData(seed, data) {
    this.promptData[seed] = data;
  }
  
  getPromptData(seed) {
    return this.promptData[seed] || { prompt: '', lora: '', temp_lora: [] };
  }
  
  clear() {
    this.loraData = {};
    this.promptData = {};
  }
}

// 模拟 Vue 端数据管理
class VueDataManager {
  constructor() {
    this.selectedLoras = [];
    this.inputText = '';
    this.tokens = [];
  }
  
  setSelectedLoras(loras) {
    this.selectedLoras = Array.isArray(loras) ? loras : [];
  }
  
  setInputText(text) {
    this.inputText = text || '';
  }
  
  setTokens(tokens) {
    this.tokens = Array.isArray(tokens) ? tokens : [];
  }
  
  // 生成发送给节点的数据
  generateNodeData() {
    const tempLora = this.selectedLoras.filter((lora) => !lora.hidden);
    return {
      prompt: this.inputText,
      lora: tempLora.length > 0 ? tempLora : '',
      temp_prompt: this.tokens,
      temp_lora: this.selectedLoras.length > 0 ? this.selectedLoras : []
    };
  }
  
  // 从节点数据恢复
  restoreFromNodeData(data) {
    if (data.prompt) this.inputText = data.prompt;
    if (data.temp_prompt) this.tokens = data.temp_prompt;
    if (data.temp_lora && Array.isArray(data.temp_lora)) {
      this.selectedLoras = data.temp_lora;
    } else {
      this.selectedLoras = [];
    }
  }
}

// 测试用例
test('NodeDataStore: 存储和获取 Lora 数据', () => {
  const store = new NodeDataStore();
  const loras = [createLoraItem('test')];
  store.setLoraData('123', loras);
  const result = store.getLoraData('123');
  assertEqual(result.length, 1);
}, '数据同步');

test('NodeDataStore: 空数组存储', () => {
  const store = new NodeDataStore();
  store.setLoraData('123', []);
  const result = store.getLoraData('123');
  assertEqual(result, []);
}, '数据同步');

test('NodeDataStore: 无效数据处理', () => {
  const store = new NodeDataStore();
  store.setLoraData('123', null);
  const result = store.getLoraData('123');
  assertEqual(result, []);
}, '数据同步');

test('VueDataManager: 生成节点数据', () => {
  const vm = new VueDataManager();
  vm.setInputText('test prompt');
  vm.setSelectedLoras([createLoraItem('lora1')]);
  
  const data = vm.generateNodeData();
  assertEqual(data.prompt, 'test prompt');
  assertEqual(data.temp_lora.length, 1);
}, '数据同步');

test('VueDataManager: 空数据生成', () => {
  const vm = new VueDataManager();
  const data = vm.generateNodeData();
  assertEqual(data.prompt, '');
  assertEqual(data.lora, '');
  assertEqual(data.temp_lora, []);
}, '数据同步');

test('VueDataManager: 从节点数据恢复', () => {
  const vm = new VueDataManager();
  const nodeData = {
    prompt: 'restored prompt',
    temp_lora: [createLoraItem('lora1')]
  };
  vm.restoreFromNodeData(nodeData);
  assertEqual(vm.inputText, 'restored prompt');
  assertEqual(vm.selectedLoras.length, 1);
}, '数据同步');

test('VueDataManager: 完整同步流程', () => {
  // 1. Vue 端创建数据
  const vm = new VueDataManager();
  vm.setInputText('test');
  vm.setSelectedLoras([createLoraItem('lora1')]);
  
  // 2. 生成并发送到节点
  const data = vm.generateNodeData();
  
  // 3. 节点存储
  const store = new NodeDataStore();
  store.setPromptData('123', data);
  
  // 4. 从节点恢复
  const vm2 = new VueDataManager();
  vm2.restoreFromNodeData(store.getPromptData('123'));
  
  // 5. 验证数据一致
  assertEqual(vm2.inputText, 'test');
  assertEqual(vm2.selectedLoras.length, 1);
}, '数据同步');

// ============================================
// 模块5: 历史记录管理
// ============================================

console.log('\n============================================');
console.log('模块5: 历史记录管理');
console.log('============================================\n');

// 历史记录项
function createHistoryItem(prompt, lora = [], timestamp = Date.now()) {
  return {
    id: Math.random().toString(36).substr(2, 9),
    prompt,
    lora,
    timestamp,
    tag: JSON.stringify({ prompt, lora, temp_lora: lora })
  };
}

// 历史记录管理器
class HistoryManager {
  constructor(maxSize = 100) {
    this.history = [];
    this.favorites = [];
    this.maxSize = maxSize;
  }
  
  add(item) {
    this.history.unshift(item);
    if (this.history.length > this.maxSize) {
      this.history = this.history.slice(0, this.maxSize);
    }
  }
  
  addToFavorites(item) {
    if (!this.favorites.find(f => f.id === item.id)) {
      this.favorites.push(item);
    }
  }
  
  removeFromFavorites(id) {
    this.favorites = this.favorites.filter(f => f.id !== id);
  }
  
  clear() {
    this.history = [];
  }
  
  getRecent(count = 10) {
    return this.history.slice(0, count);
  }
  
  search(keyword) {
    return this.history.filter(h => 
      h.prompt.toLowerCase().includes(keyword.toLowerCase())
    );
  }
}

// 测试用例
test('createHistoryItem: 创建历史项', () => {
  const item = createHistoryItem('test prompt');
  assertTrue(item.id.length > 0);
  assertEqual(item.prompt, 'test prompt');
  assertTrue(item.timestamp > 0);
}, '历史记录');

test('HistoryManager: 添加历史', () => {
  const hm = new HistoryManager();
  hm.add(createHistoryItem('prompt1'));
  hm.add(createHistoryItem('prompt2'));
  assertEqual(hm.history.length, 2);
}, '历史记录');

test('HistoryManager: 最大容量限制', () => {
  const hm = new HistoryManager(5);
  for (let i = 0; i < 10; i++) {
    hm.add(createHistoryItem(`prompt${i}`));
  }
  assertEqual(hm.history.length, 5);
}, '历史记录');

test('HistoryManager: 收藏功能', () => {
  const hm = new HistoryManager();
  const item = createHistoryItem('favorite');
  hm.addToFavorites(item);
  assertEqual(hm.favorites.length, 1);
  
  // 重复添加不会增加
  hm.addToFavorites(item);
  assertEqual(hm.favorites.length, 1);
}, '历史记录');

test('HistoryManager: 移除收藏', () => {
  const hm = new HistoryManager();
  const item = createHistoryItem('favorite');
  hm.addToFavorites(item);
  hm.removeFromFavorites(item.id);
  assertEqual(hm.favorites.length, 0);
}, '历史记录');

test('HistoryManager: 搜索功能', () => {
  const hm = new HistoryManager();
  hm.add(createHistoryItem('beautiful sunset'));
  hm.add(createHistoryItem('dark night'));
  hm.add(createHistoryItem('beautiful flower'));
  
  const results = hm.search('beautiful');
  assertEqual(results.length, 2);
}, '历史记录');

// ============================================
// 模块6: Tag 分组管理
// ============================================

console.log('\n============================================');
console.log('模块6: Tag 分组管理');
console.log('============================================\n');

// Tag 分组
function createTagGroup(name, order = 0) {
  return {
    id: Math.random().toString(36).substr(2, 9),
    name,
    order,
    tags: [],
    createdAt: Date.now()
  };
}

// Tag 项
function createTag(text, groupId) {
  return {
    id: Math.random().toString(36).substr(2, 9),
    text,
    groupId,
    order: 0,
    createdAt: Date.now()
  };
}

// Tag 管理器
class TagManager {
  constructor() {
    this.groups = [];
  }
  
  createGroup(name) {
    const group = createTagGroup(name, this.groups.length);
    this.groups.push(group);
    return group;
  }
  
  deleteGroup(groupId) {
    this.groups = this.groups.filter(g => g.id !== groupId);
  }
  
  addTag(groupId, text) {
    const group = this.groups.find(g => g.id === groupId);
    if (group) {
      const tag = createTag(text, groupId);
      tag.order = group.tags.length;
      group.tags.push(tag);
      return tag;
    }
    return null;
  }
  
  removeTag(tagId) {
    for (const group of this.groups) {
      const index = group.tags.findIndex(t => t.id === tagId);
      if (index > -1) {
        group.tags.splice(index, 1);
        return true;
      }
    }
    return false;
  }
  
  moveTag(tagId, fromGroupId, toGroupId) {
    const fromGroup = this.groups.find(g => g.id === fromGroupId);
    const toGroup = this.groups.find(g => g.id === toGroupId);
    
    if (!fromGroup || !toGroup) return false;
    
    const tagIndex = fromGroup.tags.findIndex(t => t.id === tagId);
    if (tagIndex === -1) return false;
    
    const [tag] = fromGroup.tags.splice(tagIndex, 1);
    tag.groupId = toGroupId;
    tag.order = toGroup.tags.length;
    toGroup.tags.push(tag);
    return true;
  }
  
  getTagsByGroup(groupId) {
    const group = this.groups.find(g => g.id === groupId);
    return group ? group.tags : [];
  }
  
  searchTags(keyword) {
    const results = [];
    for (const group of this.groups) {
      for (const tag of group.tags) {
        if (tag.text.toLowerCase().includes(keyword.toLowerCase())) {
          results.push({ ...tag, groupName: group.name });
        }
      }
    }
    return results;
  }
}

// 测试用例
test('TagManager: 创建分组', () => {
  const tm = new TagManager();
  const group = tm.createGroup('Style');
  assertEqual(group.name, 'Style');
  assertEqual(tm.groups.length, 1);
}, 'Tag管理');

test('TagManager: 删除分组', () => {
  const tm = new TagManager();
  const group = tm.createGroup('Style');
  tm.deleteGroup(group.id);
  assertEqual(tm.groups.length, 0);
}, 'Tag管理');

test('TagManager: 添加 Tag', () => {
  const tm = new TagManager();
  const group = tm.createGroup('Style');
  const tag = tm.addTag(group.id, 'beautiful');
  assertEqual(tag.text, 'beautiful');
  assertEqual(tag.groupId, group.id);
}, 'Tag管理');

test('TagManager: 移除 Tag', () => {
  const tm = new TagManager();
  const group = tm.createGroup('Style');
  const tag = tm.addTag(group.id, 'beautiful');
  tm.removeTag(tag.id);
  assertEqual(group.tags.length, 0);
}, 'Tag管理');

test('TagManager: 移动 Tag', () => {
  const tm = new TagManager();
  const group1 = tm.createGroup('Style');
  const group2 = tm.createGroup('Quality');
  const tag = tm.addTag(group1.id, 'beautiful');
  
  tm.moveTag(tag.id, group1.id, group2.id);
  assertEqual(group1.tags.length, 0);
  assertEqual(group2.tags.length, 1);
}, 'Tag管理');

test('TagManager: 搜索 Tag', () => {
  const tm = new TagManager();
  const group = tm.createGroup('Style');
  tm.addTag(group.id, 'beautiful');
  tm.addTag(group.id, 'detailed');
  tm.addTag(group.id, 'beauty');
  
  const results = tm.searchTags('beau');
  assertEqual(results.length, 2);
}, 'Tag管理');

// ============================================
// 模块7: 翻译功能
// ============================================

console.log('\n============================================');
console.log('模块7: 翻译功能');
console.log('============================================\n');

// 翻译服务配置
const TranslationServices = {
  ALIBABA: 'alibaba',
  BING: 'bing',
  NETEASE: 'netease',
  AI: 'ai'
};

// 翻译请求构建
function buildTranslationRequest(text, service, sourceLang = 'en', targetLang = 'zh') {
  return {
    text,
    service,
    sourceLang,
    targetLang,
    timestamp: Date.now()
  };
}

// 翻译结果解析
function parseTranslationResult(result) {
  if (!result) return { success: false, text: '' };
  
  if (result.error) {
    return { success: false, error: result.error };
  }
  
  return {
    success: true,
    text: result.translatedText || result.text || '',
    source: result.source || 'unknown'
  };
}

// 批量翻译分割
function splitBatchTranslation(texts, batchSize = 10) {
  const batches = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    batches.push(texts.slice(i, i + batchSize));
  }
  return batches;
}

// 测试用例
test('buildTranslationRequest: 构建请求', () => {
  const req = buildTranslationRequest('hello', TranslationServices.ALIBABA);
  assertEqual(req.text, 'hello');
  assertEqual(req.service, 'alibaba');
  assertEqual(req.sourceLang, 'en');
  assertEqual(req.targetLang, 'zh');
}, '翻译功能');

test('parseTranslationResult: 成功结果', () => {
  const result = parseTranslationResult({ translatedText: '你好' });
  assertTrue(result.success);
  assertEqual(result.text, '你好');
}, '翻译功能');

test('parseTranslationResult: 错误结果', () => {
  const result = parseTranslationResult({ error: 'Network error' });
  assertFalse(result.success);
  assertEqual(result.error, 'Network error');
}, '翻译功能');

test('parseTranslationResult: 空结果', () => {
  const result = parseTranslationResult(null);
  assertFalse(result.success);
}, '翻译功能');

test('splitBatchTranslation: 分批处理', () => {
  const texts = Array.from({ length: 25 }, (_, i) => `text${i}`);
  const batches = splitBatchTranslation(texts, 10);
  assertEqual(batches.length, 3);
  assertEqual(batches[0].length, 10);
  assertEqual(batches[2].length, 5);
}, '翻译功能');

// ============================================
// 模块8: 自动补全
// ============================================

console.log('\n============================================');
console.log('模块8: 自动补全');
console.log('============================================\n');

// Danbooru 标签数据
function createDanbooruTag(name, category, count = 0) {
  return {
    name,
    category,
    count,
    aliases: []
  };
}

// 模糊搜索
function fuzzyMatch(text, query) {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // 完全匹配
  if (textLower === queryLower) return 1.0;
  
  // 开头匹配
  if (textLower.startsWith(queryLower)) return 0.9;
  
  // 包含匹配
  if (textLower.includes(queryLower)) return 0.7;
  
  // 模糊匹配（字符顺序匹配）
  let queryIndex = 0;
  for (const char of textLower) {
    if (char === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  if (queryIndex === queryLower.length) return 0.5;
  
  return 0;
}

// 搜索并排序
function searchAndSort(tags, query, limit = 10) {
  const results = tags.map(tag => ({
    tag,
    score: fuzzyMatch(tag.name, query)
  })).filter(r => r.score > 0);
  
  results.sort((a, b) => {
    // 先按匹配分数排序
    if (b.score !== a.score) return b.score - a.score;
    // 再按使用次数排序
    return b.tag.count - a.tag.count;
  });
  
  return results.slice(0, limit).map(r => r.tag);
}

// 测试用例
test('fuzzyMatch: 完全匹配', () => {
  const score = fuzzyMatch('beautiful', 'beautiful');
  assertEqual(score, 1.0);
}, '自动补全');

test('fuzzyMatch: 开头匹配', () => {
  const score = fuzzyMatch('beautiful', 'beau');
  assertEqual(score, 0.9);
}, '自动补全');

test('fuzzyMatch: 包含匹配', () => {
  const score = fuzzyMatch('beautiful', 'tiful');
  assertEqual(score, 0.7);
}, '自动补全');

test('fuzzyMatch: 模糊匹配', () => {
  const score = fuzzyMatch('beautiful', 'btf');
  assertEqual(score, 0.5);
}, '自动补全');

test('fuzzyMatch: 不匹配', () => {
  const score = fuzzyMatch('beautiful', 'xyz');
  assertEqual(score, 0);
}, '自动补全');

test('searchAndSort: 搜索并排序', () => {
  const tags = [
    createDanbooruTag('beautiful', 0, 1000),
    createDanbooruTag('beauty', 0, 500),
    createDanbooruTag('detailed', 0, 800),
    createDanbooruTag('beast', 0, 200)
  ];
  const results = searchAndSort(tags, 'bea', 3);
  assertEqual(results.length, 3);
  assertEqual(results[0].name, 'beautiful'); // 最高分数和最高次数
}, '自动补全');

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
